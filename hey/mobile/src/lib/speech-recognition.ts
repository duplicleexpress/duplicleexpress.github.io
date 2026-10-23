import { Platform } from "react-native";
import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionResultEvent,
  SetCategoryOptions,
} from "expo-speech-recognition";

type Module = typeof import("expo-speech-recognition");

/**
 * La reconnaissance vocale est un module natif : elle n'existe pas dans Expo Go.
 * On la charge à la demande pour que le reste de l'application fonctionne quand même.
 */
let mod: Module | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mod = require("expo-speech-recognition") as Module;
  // Vérifie que le module natif est bien présent
  mod.ExpoSpeechRecognitionModule.isRecognitionAvailable();
} catch {
  mod = null;
}

export const speechRecognitionAvailable = mod !== null;

export async function requestSpeechPermissions(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  if (!mod) return { granted: false, canAskAgain: false };
  const res = await mod.ExpoSpeechRecognitionModule.requestPermissionsAsync();
  return { granted: res.granted, canAskAgain: res.canAskAgain };
}

export interface RecognizerHandlers {
  onResult: (text: string, isFinal: boolean) => void;
  onVolume?: (level: number) => void;
  onError: (code: string, message: string) => void;
  /** La session s'est terminée d'elle-même (limite de durée, interruption système…) */
  onEnd: () => void;
  onStart?: () => void;
}

/**
 * Micro en écoute continue. Une "session" = un énoncé ; on redémarre une session
 * après chaque phrase pour repartir d'une transcription vide.
 */
export class Recognizer {
  private subs: { remove(): void }[] = [];
  private running = false;
  /** Ignore les événements de l'ancienne session pendant un redémarrage */
  private ignoring = false;

  constructor(
    private locale: string,
    private handlers: RecognizerHandlers,
    private speakerOn = true,
  ) {}

  get isRunning() {
    return this.running;
  }

  start() {
    if (!mod || this.running) return;
    const M = mod.ExpoSpeechRecognitionModule;
    this.subs = [
      M.addListener("start", () => {
        this.ignoring = false;
        this.handlers.onStart?.();
      }),
      M.addListener("result", (e: ExpoSpeechRecognitionResultEvent) => {
        if (this.ignoring) return;
        const text = e.results[0]?.transcript ?? "";
        this.handlers.onResult(text, e.isFinal);
      }),
      M.addListener("volumechange", (e: { value: number }) => this.handlers.onVolume?.(e.value)),
      M.addListener("error", (e: ExpoSpeechRecognitionErrorEvent) => {
        if (e.error === "aborted" || e.error === "no-speech") return;
        this.handlers.onError(e.error, e.message);
      }),
      M.addListener("end", () => {
        if (!this.running) return;
        // Redémarrage automatique : écoute continue pendant tout l'appel
        setTimeout(() => this.running && this.startSession(), 150);
        if (!this.ignoring) this.handlers.onEnd();
      }),
    ];
    this.running = true;
    this.startSession();
  }

  /** Termine l'énoncé en cours et repart sur une transcription vide. */
  restart() {
    if (!mod || !this.running) return;
    this.ignoring = true;
    mod.ExpoSpeechRecognitionModule.abort(); // l'événement "end" relancera une session
  }

  stop() {
    this.running = false;
    this.subs.forEach((s) => s.remove());
    this.subs = [];
    mod?.ExpoSpeechRecognitionModule.abort();
  }

  setSpeaker(on: boolean) {
    this.speakerOn = on;
    if (!mod || Platform.OS !== "ios" || !this.running) return;
    try {
      mod.ExpoSpeechRecognitionModule.setCategoryIOS(this.category());
    } catch {}
  }

  /** Haut-parleur activé : son sur le haut-parleur ; sinon : écouteur du téléphone (comme un appel). */
  private category(): SetCategoryOptions {
    return {
      category: "playAndRecord",
      categoryOptions: this.speakerOn ? ["defaultToSpeaker", "allowBluetooth"] : ["allowBluetooth"],
      mode: "voiceChat",
    };
  }

  private startSession() {
    if (!mod) return;
    const M = mod.ExpoSpeechRecognitionModule;
    let onDevice = false;
    try {
      onDevice = M.supportsOnDeviceRecognition();
    } catch {}
    M.start({
      lang: this.locale,
      interimResults: true,
      continuous: true,
      maxAlternatives: 1,
      addsPunctuation: true,
      // Sur l'appareil quand c'est possible : plus privé et sans limite de durée
      requiresOnDeviceRecognition: onDevice,
      iosTaskHint: "dictation",
      // Annulation d'écho : évite que le micro entende la voix de HEY dans le haut-parleur
      iosVoiceProcessingEnabled: true,
      iosCategory: this.category(),
      volumeChangeEventOptions: { enabled: true, intervalMillis: 120 },
      androidIntentOptions: { EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 10000 },
    });
  }
}
