import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Banner, Icon, type IconName } from "@/components/ui";
import { useApp } from "@/context/app";
import { ApiError, api, type Conversation } from "@/lib/api";
import { radius, space, type } from "@/theme/tokens";

const MODE_ICON: Record<Conversation["mode"], IconName> = {
  video: "videocam",
  voice: "mic",
  chat: "chatbubble-ellipses",
};

export default function History() {
  const { colors, prefs, t } = useApp();
  const [items, setItems] = useState<Conversation[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { conversations } = await api.listConversations();
      setItems(conversations);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t.common.error);
      setItems((prev) => prev ?? []);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const remove = (c: Conversation) =>
    Alert.alert(t.history.delete, t.history.deleteConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteConversation(c.id);
            setItems((prev) => prev?.filter((x) => x.id !== c.id) ?? null);
          } catch (e) {
            setError(e instanceof ApiError ? e.message : t.common.error);
          }
        },
      },
    ]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(prefs.locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  if (items === null) return <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />;

  return (
    <FlatList
      data={items}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ padding: space.md, gap: space.sm, flexGrow: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
      ListHeaderComponent={error ? <Banner tone="danger" text={error} action={{ label: t.common.retry, onPress: load }} /> : undefined}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Icon name="time-outline" size={42} color={colors.textSecondary} />
          <Text style={[type.body, { color: colors.textSecondary }]}>{t.history.empty}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push({ pathname: "/chat", params: { conversationId: item.id } })}
          onLongPress={() => remove(item)}
          accessibilityRole="button"
          accessibilityHint={t.history.resume}
          style={({ pressed }) => [
            styles.item,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
            <Icon name={MODE_ICON[item.mode]} size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.label, { color: colors.text, fontWeight: "600" }]} numberOfLines={1}>
              {item.title ?? t.history.untitled}
            </Text>
            {item.summary ? (
              <Text style={[type.caption, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.summary}
              </Text>
            ) : null}
            <Text style={[type.caption, { color: colors.textSecondary }]}>{formatDate(item.updatedAt)}</Text>
          </View>
          <Pressable onPress={() => remove(item)} hitSlop={10} accessibilityLabel={t.history.delete}>
            <Icon name="trash-outline" size={20} color={colors.textSecondary} />
          </Pressable>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
