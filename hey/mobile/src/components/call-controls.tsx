import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "./ui";

export function CallButton({
  icon,
  label,
  onPress,
  active = true,
  danger,
  disabled,
  rotateIcon,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** false = fonction coupée (bouton blanc, icône barrée) */
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  /** Combiné posé (icône raccrocher) */
  rotateIcon?: boolean;
}) {
  const bg = danger ? "#FF3B30" : active ? "rgba(255,255,255,0.18)" : "#FFFFFF";
  const fg = danger ? "#FFFFFF" : active ? "#FFFFFF" : "#111111";
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: !active, disabled }}
        disabled={disabled}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] },
        ]}
      >
        <View style={rotateIcon ? { transform: [{ rotate: "135deg" }] } : undefined}>
          <Icon name={icon} size={28} color={fg} />
        </View>
      </Pressable>
      <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Text>
    </View>
  );
}

export function CallControls({ children }: { children: React.ReactNode }) {
  return <View style={styles.bar}>{children}</View>;
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "flex-start",
    paddingHorizontal: 8,
    paddingTop: 18,
    paddingBottom: 8,
    borderRadius: 32,
    backgroundColor: "rgba(20,20,24,0.55)",
    marginHorizontal: 12,
  },
  wrap: { alignItems: "center", flex: 1, maxWidth: 84, gap: 6 },
  button: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  label: { color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: "500", textAlign: "center" },
});
