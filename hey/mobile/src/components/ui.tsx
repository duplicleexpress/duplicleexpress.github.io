import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { useApp } from "@/context/app";
import { radius, space, type } from "@/theme/tokens";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const { colors } = useApp();
  return <Ionicons name={name} size={size} color={color ?? colors.text} />;
}

export function Screen({
  children,
  edges = ["top", "bottom", "left", "right"],
  style,
}: {
  children: ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useApp();
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: colors.background }, style]}>
      {children}
    </SafeAreaView>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: object }) {
  const { colors } = useApp();
  return <Text style={[type.title, { color: colors.text }, style]}>{children}</Text>;
}

export function Body({ children, secondary, style }: { children: ReactNode; secondary?: boolean; style?: object }) {
  const { colors } = useApp();
  return (
    <Text style={[type.body, { color: secondary ? colors.textSecondary : colors.text }, style]}>{children}</Text>
  );
}

export function Caption({ children, style }: { children: ReactNode; style?: object }) {
  const { colors } = useApp();
  return <Text style={[type.caption, { color: colors.textSecondary }, style]}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useApp();
  const bg =
    variant === "primary"
      ? colors.accent
      : variant === "danger"
        ? colors.danger
        : variant === "secondary"
          ? colors.surfaceAlt
          : "transparent";
  const fg = variant === "primary" || variant === "danger" ? colors.accentText : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={20} color={fg} /> : null}
          <Text style={[type.label, { color: fg, fontWeight: "600" }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field(props: TextInputProps) {
  const { colors } = useApp();
  return (
    <TextInput
      placeholderTextColor={colors.textSecondary}
      {...props}
      style={[
        styles.field,
        { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
        props.style,
      ]}
    />
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useApp();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const { colors } = useApp();
  return <Text style={[styles.section, { color: colors.textSecondary }]}>{children}</Text>;
}

export function Row({
  icon,
  label,
  detail,
  onPress,
  right,
  danger,
}: {
  icon?: IconName;
  label: string;
  detail?: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
}) {
  const { colors } = useApp();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      {icon ? <Icon name={icon} size={20} color={danger ? colors.danger : colors.accent} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
        {detail ? <Caption style={{ marginTop: 2 }}>{detail}</Caption> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-forward" size={18} color={colors.textSecondary} /> : null)}
    </Pressable>
  );
}

export function ToggleRow({
  icon,
  label,
  detail,
  value,
  onChange,
}: {
  icon?: IconName;
  label: string;
  detail?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors } = useApp();
  return (
    <Row
      icon={icon}
      label={label}
      detail={detail}
      right={<Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent }} />}
    />
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors } = useApp();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surfaceAlt }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && { backgroundColor: colors.surface }]}
          >
            <Text style={[type.label, { color: active ? colors.text : colors.textSecondary }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Banner({
  text,
  tone = "warning",
  action,
}: {
  text: string;
  tone?: "warning" | "danger" | "info";
  action?: { label: string; onPress: () => void };
}) {
  const { colors } = useApp();
  const c = tone === "danger" ? colors.danger : tone === "info" ? colors.accent : colors.warning;
  return (
    <View style={[styles.banner, { borderColor: c, backgroundColor: colors.surface }]}>
      <Icon name={tone === "info" ? "information-circle" : "warning"} size={18} color={c} />
      <Text style={[type.caption, { color: colors.text, flex: 1 }]}>{text}</Text>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text style={[type.label, { color: c }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  field: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    fontSize: 17,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  section: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: space.lg,
    marginBottom: space.sm,
    marginLeft: space.sm,
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 14 },
  segmented: { flexDirection: "row", borderRadius: radius.md, padding: 3, marginVertical: space.sm },
  segment: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: radius.sm },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
});
