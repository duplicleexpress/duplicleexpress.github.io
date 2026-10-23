import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Row } from "@/components/ui";
import { useApp } from "@/context/app";
import { space, type } from "@/theme/tokens";

export default function Profile() {
  const { colors, session, prefs, t } = useApp();
  const user = session?.user;
  const initial = (user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.lg }}>
      <View style={{ alignItems: "center", gap: space.sm, marginTop: space.md }}>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={[type.title, { color: colors.accentText }]}>{initial}</Text>
        </View>
        <Text style={[type.heading, { color: colors.text }]}>{user?.email}</Text>
      </View>
      <Card>
        <Row icon="mail-outline" label={t.profile.email} detail={user?.email ?? "—"} />
        <Row
          icon="calendar-outline"
          label={t.profile.member}
          detail={user?.created_at ? new Date(user.created_at).toLocaleDateString(prefs.locale) : "—"}
        />
        <Row icon="time-outline" label={t.home.history} onPress={() => router.push("/history")} />
        <Row icon="settings-outline" label={t.home.settings} onPress={() => router.push("/settings")} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" },
});
