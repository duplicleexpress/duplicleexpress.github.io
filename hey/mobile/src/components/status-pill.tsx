import { StyleSheet, Text, View } from "react-native";
import { useApp } from "@/context/app";
import type { VoiceStatus } from "@/hooks/use-voice-session";

const DOT: Record<VoiceStatus, string> = {
  idle: "#9A9AA6",
  starting: "#F5B83D",
  listening: "#3DD68C",
  hearing: "#3DD68C",
  thinking: "#7C7CFF",
  speaking: "#7C7CFF",
  error: "#FF6369",
};

/** Indicateur d'activité de HEY (état de connexion et de conversation). */
export function StatusPill({ status, muted, offline }: { status: VoiceStatus; muted: boolean; offline: boolean }) {
  const { t } = useApp();
  const label = offline
    ? t.call.offline
    : muted && (status === "listening" || status === "hearing")
      ? t.call.muted
      : {
          idle: t.call.connecting,
          starting: t.call.connecting,
          listening: t.call.listening,
          hearing: t.call.hearing,
          thinking: t.call.thinking,
          speaking: t.call.speaking,
          error: t.call.error,
        }[status];
  const color = offline ? "#F5B83D" : muted ? "#F5B83D" : DOT[status];
  return (
    <View style={styles.pill} accessibilityRole="text" accessibilityLiveRegion="polite">
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(20,20,24,0.6)",
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});
