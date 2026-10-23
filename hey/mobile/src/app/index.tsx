import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { HeyOrb } from "@/components/hey-orb";
import { Banner, Icon, Screen, type IconName } from "@/components/ui";
import { useApp } from "@/context/app";
import { api } from "@/lib/api";
import { radius, space, type } from "@/theme/tokens";

export default function Home() {
  const { colors, t } = useApp();
  const [serverOk, setServerOk] = useState(true);

  useEffect(() => {
    void api.health().then(setServerOk);
  }, []);

  const options: { icon: IconName; label: string; onPress: () => void }[] = [
    { icon: "videocam", label: t.home.video, onPress: () => router.push("/call") },
    { icon: "mic", label: t.home.voice, onPress: () => router.push("/voice") },
    { icon: "chatbubble-ellipses", label: t.home.chat, onPress: () => router.push("/chat") },
  ];

  return (
    <Screen>
      <View style={styles.top}>
        <TopIcon icon="time-outline" label={t.home.history} onPress={() => router.push("/history")} />
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <TopIcon icon="person-circle-outline" label={t.home.profile} onPress={() => router.push("/profile")} />
          <TopIcon icon="settings-outline" label={t.home.settings} onPress={() => router.push("/settings")} />
        </View>
      </View>

      <View style={styles.header}>
        <Text style={[type.hero, { color: colors.text }]} accessibilityRole="header">
          {t.appName}
        </Text>
        <Text style={[type.heading, { color: colors.textSecondary, fontWeight: "500" }]}>{t.tagline}</Text>
      </View>

      <View style={styles.center}>
        <HeyOrb size={190} label={t.home.callButton} onPress={() => router.push("/call")} />
        <Text style={[type.caption, { color: colors.textSecondary, textAlign: "center", maxWidth: 260 }]}>
          {t.home.hint}
        </Text>
      </View>

      {!serverOk ? (
        <View style={{ paddingHorizontal: space.md, marginBottom: space.sm }}>
          <Banner text={t.home.serverDown} action={{ label: t.common.retry, onPress: () => void api.health().then(setServerOk) }} />
        </View>
      ) : null}

      <View style={styles.options}>
        {options.map((o) => (
          <Pressable
            key={o.label}
            onPress={o.onPress}
            accessibilityRole="button"
            accessibilityLabel={o.label}
            style={({ pressed }) => [
              styles.option,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.accentSoft }]}>
              <Icon name={o.icon} size={22} color={colors.accent} />
            </View>
            <Text style={[type.label, { color: colors.text, textAlign: "center" }]} numberOfLines={2}>
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

function TopIcon({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors } = useApp();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.topIcon, { backgroundColor: colors.surface, opacity: pressed ? 0.6 : 1 }]}
    >
      <Icon name={icon} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: space.md, paddingTop: space.sm },
  topIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  header: { alignItems: "center", marginTop: space.lg, gap: space.xs },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.sm },
  options: { flexDirection: "row", gap: space.sm, paddingHorizontal: space.md, paddingBottom: space.md },
  option: {
    flex: 1,
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.md,
    paddingHorizontal: space.xs,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  optionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
