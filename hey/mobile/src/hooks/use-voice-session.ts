import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useApp } from "@/context/app";
import { ApiError, streamChat, type ConversationMode, type FrameImage } from "@/lib/api";
import { isBargeIn } from "@/lib/echo";
import { SentenceChunker } from "@/lib/sentences";
import { Recognizer, requestSpeechPermissions, speechRecognitionAvailable } from "@/lib/speech-recognition";
import { Speaker } from "@/lib/tts";
import { TurnDetector } from "@/lib/turn-detector";

export type VoiceStatus = "idle" | "starting" | "listening" | "hearing" | "thinking" | "speaking" | "error";

export interface CaptionLine {
  role: "user" | "assistant";
  text: string;
}

export interface VoiceSessionOptions {
  mode: Extract<ConversationMode, "video" | "voice">;
  conversationId?: string;
  /** Capture d'une image caméra (mode vidéo). Renvoie null si la caméra est coupée. */
  captureFrame?: () => Promise<FrameImage | null>;
  isCameraOn?: () => boolean;
}

const SILENCE_MS = 1100;
const HESITATION_MS = 2200;
/** Au-delà de cette durée de parole, on joint aussi l'image du début de la phrase. */
const LONG_UTTERANCE_MS = 2500;

/**
 * Cœur de l'appel avec HEY : micro → détection de fin de phrase → envoi (texte + images)
 * → réponse en flux → lecture à voix haute phrase par phrase, avec interruption possible.
 */
export function useVoiceSession(opts: VoiceSessionOptions) {
  const { prefs, t } = useApp();
  const [status, setStatusState] = useState<VoiceStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [captions, setCaptions] = useState<CaptionLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [volume, setVolume] = useState(0);
  const [conversationId, setConversationId] = useState<string | undefined>(opts.conversationId);

  const statusRef = useRef<VoiceStatus>("idle");
  const convRef = useRef<string | undefined>(opts.conversationId);
  const optsRef = useRef(opts);
  const prefsRef = useRef(prefs);
  // Les callbacks natifs lisent toujours les dernières options et préférences
  useLayoutEffect(() => {
    optsRef.current = opts;
    prefsRef.current = prefs;
  });

  const recognizer = useRef<Recognizer | null>(null);
  const speaker = useRef<Speaker | null>(null);
  const detector = useRef<TurnDetector | null>(null);
  const request = useRef<AbortController | null>(null);
  const aiText = useRef("");
  const speechStartedAt = useRef(0);
  const startFrame = useRef<Promise<FrameImage | null> | null>(null);
  const lastFailed = useRef<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);

  const setStatus = (s: VoiceStatus) => {
    statusRef.current = s;
    setStatusState(s);
  };

  const pushCaption = (line: CaptionLine) => setCaptions((prev) => [...prev.slice(-7), line]);
  const updateLastAssistant = (text: string) =>
    setCaptions((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.role === "assistant") copy[copy.length - 1] = { role: "assistant", text };
      else copy.push({ role: "assistant", text });
      return copy.slice(-8);
    });

  /** Coupe la parole à HEY (voix et génération). */
  const interrupt = useCallback(() => {
    request.current?.abort();
    request.current = null;
    speaker.current?.stop();
    if (statusRef.current === "thinking" || statusRef.current === "speaking") setStatus("listening");
  }, []);

  const send = useCallback(async (text: string) => {
    const o = optsRef.current;
    const p = prefsRef.current;
    interrupt();
    setLiveText("");
    setError(null);
    pushCaption({ role: "user", text });
    setStatus("thinking");

    // Images synchronisées avec la parole : fin de phrase (+ début si la phrase est longue)
    const cameraOn = o.mode === "video" && (o.isCameraOn?.() ?? false);
    const images: FrameImage[] = [];
    if (cameraOn && o.captureFrame) {
      const long = Date.now() - speechStartedAt.current > LONG_UTTERANCE_MS;
      const [first, last] = await Promise.all([
        long && startFrame.current ? startFrame.current : Promise.resolve(null),
        o.captureFrame(),
      ]);
      if (first) images.push(first);
      if (last) images.push(last);
    }
    startFrame.current = null;

    const controller = new AbortController();
    request.current = controller;
    aiText.current = "";
    const chunker = new SentenceChunker();

    try {
      const result = await streamChat(
        {
          conversationId: convRef.current,
          mode: o.mode,
          text,
          cameraOn,
          locale: p.locale,
          images,
        },
        {
          onConversation: (id) => {
            convRef.current = id;
            setConversationId(id);
          },
          onDelta: (delta) => {
            if (controller.signal.aborted) return;
            aiText.current += delta;
            updateLastAssistant(aiText.current);
            for (const s of chunker.push(delta)) speaker.current?.enqueue(s);
          },
        },
        controller.signal,
      );
      if (result.interrupted || controller.signal.aborted) return;
      for (const s of chunker.flush()) speaker.current?.enqueue(s);
      lastFailed.current = null;
      setCanRetry(false);
      setOffline(false);
      if (!speaker.current?.isActive) setStatus("listening");
    } catch (e) {
      if (controller.signal.aborted) return;
      const err = e instanceof ApiError ? e : new ApiError(t.common.error, "unknown");
      lastFailed.current = text;
      setCanRetry(true);
      setOffline(err.offline);
      setError(err.message);
      setStatus("listening");
    } finally {
      if (request.current === controller) request.current = null;
    }
  }, [interrupt, t]);

  const onRecognized = useCallback(
    (text: string) => {
      const s = statusRef.current;
      if (s === "thinking" || s === "speaking") {
        // L'utilisateur parle pendant que HEY réfléchit ou parle : interruption ?
        if (!prefsRef.current.bargeIn) return;
        const echoRef = `${speaker.current?.recentlySpoken ?? ""} ${aiText.current}`;
        if (!isBargeIn(text, echoRef)) return;
        interrupt();
      }
      if (statusRef.current !== "hearing") setStatus("hearing");
      setLiveText(text);
      detector.current?.onResult(text);
    },
    [interrupt],
  );

  const start = useCallback(async () => {
    if (statusRef.current !== "idle" && statusRef.current !== "error") return;
    if (!speechRecognitionAvailable) {
      setError(t.call.needsDevBuild);
      setStatus("error");
      return;
    }
    setStatus("starting");
    const perm = await requestSpeechPermissions();
    if (!perm.granted) {
      setError(t.call.permissionMic);
      setStatus("error");
      return;
    }
    const p = prefsRef.current;

    speaker.current = new Speaker(p.locale, p.speechRate, {
      onStart: () => setStatus("speaking"),
      onIdle: () => {
        // La réponse peut encore arriver (réseau lent) : HEY "réfléchit" en attendant la suite
        if (statusRef.current === "speaking") setStatus(request.current ? "thinking" : "listening");
        // Repart sur une transcription vide pour ne pas garder l'écho de la voix de HEY
        detector.current?.reset();
        recognizer.current?.restart();
      },
    });

    detector.current = new TurnDetector({
      silenceMs: SILENCE_MS,
      hesitationMs: HESITATION_MS,
      onSpeechStart: () => {
        speechStartedAt.current = Date.now();
        const o = optsRef.current;
        if (o.mode === "video" && o.isCameraOn?.() && o.captureFrame) startFrame.current = o.captureFrame();
      },
      onTurn: (text) => {
        recognizer.current?.restart();
        void send(text);
      },
    });

    recognizer.current = new Recognizer(
      p.locale,
      {
        onResult: (text) => onRecognized(text),
        onVolume: (v) => setVolume(v),
        onError: (code) => {
          if (code === "not-allowed") {
            setError(t.call.permissionMic);
            setStatus("error");
          } else if (code === "network") {
            setOffline(true);
          }
        },
        onEnd: () => detector.current?.flush(),
      },
      p.speakerOn,
    );
    recognizer.current.start();
    void activateKeepAwakeAsync("hey-call").catch(() => {});
    setStatus("listening");
  }, [onRecognized, send, t]);

  const end = useCallback(() => {
    request.current?.abort();
    request.current = null;
    speaker.current?.stop();
    recognizer.current?.stop();
    detector.current?.reset();
    recognizer.current = null;
    speaker.current = null;
    detector.current = null;
    deactivateKeepAwake("hey-call");
    setStatus("idle");
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (next) {
        detector.current?.reset();
        setLiveText("");
        recognizer.current?.stop();
      } else {
        recognizer.current?.start();
      }
      return next;
    });
  }, []);

  const setSpeaker = useCallback((on: boolean) => recognizer.current?.setSpeaker(on), []);

  const retry = useCallback(() => {
    if (lastFailed.current) void send(lastFailed.current);
  }, [send]);

  /** Envoi manuel (ex. phrase tapée ou bouton "c'est fini"). */
  const finishTurn = useCallback(() => detector.current?.flush(), []);

  // L'application passe en arrière-plan : on coupe micro et voix immédiatement
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" && statusRef.current !== "idle") end();
    });
    return () => sub.remove();
  }, [end]);

  useEffect(() => () => end(), [end]);

  useEffect(() => {
    speaker.current?.setRate(prefs.speechRate);
  }, [prefs.speechRate]);

  return {
    status,
    muted,
    liveText,
    captions,
    error,
    offline,
    volume,
    conversationId,
    start,
    end,
    interrupt,
    toggleMute,
    setSpeaker,
    retry,
    finishTurn,
    canRetry,
  };
}
