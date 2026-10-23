import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useApp } from "@/context/app";
import type { VoiceStatus } from "@/hooks/use-voice-session";

/**
 * L'orbe animée de HEY.
 * - repos : respiration lente
 * - écoute : réagit au volume de la voix
 * - réflexion : pulsation rapide
 * - parole : ondes qui s'éloignent
 */
export function HeyOrb({
  size = 200,
  status = "idle",
  volume = 0,
  label,
  onPress,
  accessibilityLabel,
  light,
}: {
  size?: number;
  status?: VoiceStatus;
  volume?: number;
  label?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Couleurs claires pour un fond vidéo */
  light?: boolean;
}) {
  const { colors } = useApp();
  const breath = useSharedValue(0);
  const wave = useSharedValue(0);
  const level = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(breath);
    cancelAnimation(wave);
    const speed = status === "thinking" ? 500 : status === "speaking" ? 900 : 2200;
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: speed, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: speed, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
    wave.value = 0;
    wave.value = withRepeat(withTiming(1, { duration: status === "speaking" ? 1100 : 2600, easing: Easing.out(Easing.cubic) }), -1);
  }, [status, breath, wave]);

  useEffect(() => {
    const active = status === "hearing" || status === "listening";
    level.value = withSpring(active ? Math.max(0, Math.min(volume, 10)) / 10 : 0, { damping: 14 });
  }, [volume, status, level]);

  const core = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breath.value * 0.04 + level.value * 0.12 }],
  }));
  const ring1 = useAnimatedStyle(() => ({
    opacity: (1 - wave.value) * 0.45,
    transform: [{ scale: 1 + wave.value * 0.55 }],
  }));
  const ring2 = useAnimatedStyle(() => ({
    opacity: (1 - ((wave.value + 0.5) % 1)) * 0.3,
    transform: [{ scale: 1 + ((wave.value + 0.5) % 1) * 0.55 }],
  }));

  const accent = light ? "#FFFFFF" : colors.accent;
  const glow = status === "error" ? colors.danger : accent;

  return (
    <View style={{ width: size * 1.6, height: size * 1.6, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[styles.ring, { width: size, height: size, borderColor: glow }, ring1]} />
      <Animated.View style={[styles.ring, { width: size, height: size, borderColor: glow }, ring2]} />
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
      >
        <Animated.View
          style={[
            styles.core,
            {
              width: size,
              height: size,
              backgroundColor: light ? "rgba(255,255,255,0.18)" : colors.accent,
              shadowColor: glow,
            },
            core,
          ]}
        >
          <View style={[styles.inner, { width: size * 0.62, height: size * 0.62, backgroundColor: light ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.18)" }]} />
          {label ? <Text style={[styles.label, { fontSize: size * 0.11 }]}>{label}</Text> : null}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: "absolute", borderRadius: 999, borderWidth: 2 },
  core: {
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.55,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  inner: { position: "absolute", borderRadius: 999 },
  label: { color: "#FFFFFF", fontWeight: "700", letterSpacing: 0.5, textAlign: "center", paddingHorizontal: 12 },
});
