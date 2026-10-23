import { CameraView, useCameraPermissions, type CameraType } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CallButton, CallControls } from "@/components/call-controls";
import { HeyOrb } from "@/components/hey-orb";
import { StatusPill } from "@/components/status-pill";
import { Button, Icon } from "@/components/ui";
import { useApp } from "@/context/app";
import { useVoiceSession } from "@/hooks/use-voice-session";
import { captureFrame } from "@/lib/frames";
import { speechRecognitionAvailable } from "@/lib/speech-recognition";

/**
 * Écran d'appel avec HEY, façon FaceTime.
 * - mode "video" : caméra plein écran, HEY reçoit des images synchronisées avec la parole
 * - mode "voice" : conversation vocale seule
 */
export function CallScreen({ mode }: { mode: "video" | "voice" }) {
  const { prefs, setPrefs, t } = useApp();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ conversationId?: string }>();

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraOn, setCameraOn] = useState(mode === "video");
  const [facing, setFacing] = useState<CameraType>("back");
  const cameraRef = useRef<CameraView>(null);
  const cameraReady = useRef(false);
  const cameraOnRef = useRef(false);
  useEffect(() => {
    cameraOnRef.current = cameraOn && Boolean(permission?.granted);
  }, [cameraOn, permission?.granted]);

  const session = useVoiceSession({
    mode,
    conversationId: params.conversationId,
    isCameraOn: () => cameraOnRef.current && cameraReady.current,
    captureFrame: () => captureFrame(cameraOnRef.current && cameraReady.current ? cameraRef.current : null),
  });

  const needsCamera = mode === "video" && cameraOn && permission && !permission.granted;

  // Démarre l'écoute dès que les autorisations sont réglées
  useEffect(() => {
    if (mode === "video" && !permission) return;
    if (needsCamera) return;
    void session.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted, mode]);

  const hangUp = useCallback(() => {
    session.end();
    setCameraOn(false);
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [session]);

  const toggleSpeaker = () => {
    const next = !prefs.speakerOn;
    setPrefs({ speakerOn: next });
    session.setSpeaker(next);
  };

  const showCamera = mode === "video" && cameraOn && permission?.granted;
  const busy = session.status === "speaking" || session.status === "thinking";

  return (
    <View style={styles.root}>
      {showCamera ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mute
          animateShutter={false}
          onCameraReady={() => (cameraReady.current = true)}
          onMountError={() => (cameraReady.current = false)}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.dark]} />
      )}

      {/* Toucher l'écran pendant que HEY parle = l'interrompre */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={busy ? session.interrupt : undefined}
        accessibilityLabel={busy ? t.call.tapToInterrupt : undefined}
      />

      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <StatusPill status={session.status} muted={session.muted} offline={session.offline} />
        {mode === "video" && !showCamera && permission?.granted ? (
          <Text style={styles.notice}>{t.call.cameraOff}</Text>
        ) : null}
      </View>

      <View style={styles.middle} pointerEvents="box-none">
        {needsCamera ? (
          <PermissionCard
            text={t.call.permissionCamera}
            canAsk={permission?.canAskAgain ?? true}
            onAllow={requestPermission}
          />
        ) : !speechRecognitionAvailable || session.status === "error" ? (
          <View style={styles.card}>
            <Icon name="alert-circle" size={28} color="#FFFFFF" />
            <Text style={styles.cardText}>{session.error ?? t.call.needsDevBuild}</Text>
            {speechRecognitionAvailable ? (
              <Button label={t.call.openSettings} variant="secondary" onPress={() => void Linking.openSettings()} />
            ) : null}
          </View>
        ) : showCamera ? null : (
          <HeyOrb size={170} status={session.status} volume={session.volume} onPress={busy ? session.interrupt : undefined} />
        )}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 8 }]} pointerEvents="box-none">
        <Captions lines={session.captions} live={session.liveText} hint={t.call.startHint} />
        {session.error && session.status !== "error" ? (
          <Pressable onPress={session.retry} style={styles.errorBar}>
            <Text style={styles.errorText}>{session.error}</Text>
            {session.canRetry ? <Text style={styles.retry}>{t.common.retry}</Text> : null}
          </Pressable>
        ) : null}
        <CallControls>
          <CallButton
            icon={session.muted ? "mic-off" : "mic"}
            label={t.call.mic}
            active={!session.muted}
            onPress={session.toggleMute}
          />
          {mode === "video" ? (
            <>
              <CallButton
                icon={cameraOn ? "videocam" : "videocam-off"}
                label={t.call.camera}
                active={cameraOn}
                onPress={() => {
                  cameraReady.current = false;
                  setCameraOn((v) => !v);
                }}
              />
              <CallButton
                icon="camera-reverse"
                label={t.call.flip}
                disabled={!showCamera}
                onPress={() => {
                  cameraReady.current = false;
                  setFacing((f) => (f === "back" ? "front" : "back"));
                }}
              />
            </>
          ) : null}
          <CallButton
            icon={prefs.speakerOn ? "volume-high" : "volume-low"}
            label={t.call.speaker}
            active={prefs.speakerOn}
            onPress={toggleSpeaker}
          />
          <CallButton icon="call" label={t.call.end} danger rotateIcon onPress={hangUp} />
        </CallControls>
      </View>
    </View>
  );
}

function Captions({ lines, live, hint }: { lines: { role: string; text: string }[]; live: string; hint: string }) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const shown = lines.slice(-3);
  return (
    <ScrollView
      ref={scroll}
      style={styles.captions}
      contentContainerStyle={{ gap: 6, justifyContent: "flex-end", flexGrow: 1 }}
      onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
      pointerEvents="none"
    >
      {shown.length === 0 && !live ? <Text style={styles.hint}>{hint}</Text> : null}
      {shown.map((l, i) => (
        <Text key={i} style={[styles.caption, l.role === "user" ? styles.captionUser : null]} numberOfLines={l.role === "user" ? 2 : 6}>
          {l.text}
        </Text>
      ))}
      {live ? <Text style={[styles.caption, styles.captionUser, { opacity: 0.75 }]}>{live}</Text> : null}
    </ScrollView>
  );
}

function PermissionCard({ text, canAsk, onAllow }: { text: string; canAsk: boolean; onAllow: () => void }) {
  const { t } = useApp();
  return (
    <View style={styles.card}>
      <Icon name="camera" size={28} color="#FFFFFF" />
      <Text style={[styles.cardText, { fontWeight: "700" }]}>{t.call.permissionTitle}</Text>
      <Text style={styles.cardText}>{text}</Text>
      {canAsk ? (
        <Button label={t.call.allow} onPress={onAllow} />
      ) : (
        <Button label={t.call.openSettings} onPress={() => void Linking.openSettings()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  dark: { backgroundColor: "#0E0E14" },
  top: { position: "absolute", left: 0, right: 0, top: 0, alignItems: "center", gap: 8 },
  notice: {
    color: "#FFFFFF",
    fontSize: 13,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  middle: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  bottom: { gap: 10 },
  captions: { maxHeight: 200, marginHorizontal: 16 },
  caption: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 23,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    overflow: "hidden",
    alignSelf: "flex-start",
    maxWidth: "92%",
  },
  captionUser: { alignSelf: "flex-end", backgroundColor: "rgba(91,91,246,0.75)" },
  hint: { color: "rgba(255,255,255,0.85)", textAlign: "center", fontSize: 15 },
  card: {
    backgroundColor: "rgba(30,30,38,0.92)",
    borderRadius: 24,
    padding: 24,
    gap: 14,
    alignItems: "center",
    maxWidth: 360,
  },
  cardText: { color: "#FFFFFF", textAlign: "center", fontSize: 16, lineHeight: 22 },
  errorBar: {
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(229,72,77,0.9)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: { color: "#FFFFFF", flex: 1, fontSize: 14 },
  retry: { color: "#FFFFFF", fontWeight: "700" },
});
