import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Banner, Icon } from "@/components/ui";
import { useApp } from "@/context/app";
import { ApiError, api, streamChat } from "@/lib/api";
import { radius, space, type } from "@/theme/tokens";

interface Bubble {
  id: string;
  role: "user" | "assistant";
  text: string;
  imageCount?: number;
  interrupted?: boolean;
}

export default function Chat() {
  const { colors, prefs, t } = useApp();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ conversationId?: string }>();
  const [conversationId, setConversationId] = useState<string | undefined>(params.conversationId);
  const [title, setTitle] = useState<string | null>(null);
  const [items, setItems] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(Boolean(params.conversationId));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const list = useRef<FlatList<Bubble>>(null);

  // Reprise d'une conversation existante
  useEffect(() => {
    if (!params.conversationId) return;
    api
      .getConversation(params.conversationId)
      .then(({ conversation, messages }) => {
        setTitle(conversation.title);
        setItems(
          messages.map((m) => ({
            id: m.id,
            role: m.role,
            text: m.content,
            imageCount: m.imageCount,
            interrupted: m.interrupted,
          })),
        );
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t.common.error))
      .finally(() => setLoading(false));
  }, [params.conversationId, t]);

  useEffect(() => () => controller.current?.abort(), []);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setError(null);
    const aiId = `ai-${Date.now()}`;
    setItems((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text }, { id: aiId, role: "assistant", text: "" }]);
    setSending(true);
    const ctrl = new AbortController();
    controller.current = ctrl;
    try {
      await streamChat(
        { conversationId, mode: "chat", text, cameraOn: false, locale: prefs.locale, images: [] },
        {
          onConversation: setConversationId,
          onDelta: (d) => setItems((prev) => prev.map((b) => (b.id === aiId ? { ...b, text: b.text + d } : b))),
        },
        ctrl.signal,
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t.common.error);
      setItems((prev) => prev.filter((b) => !(b.id === aiId && !b.text)));
      setInput(text);
    } finally {
      setSending(false);
      controller.current = null;
    }
  };

  const stop = () => controller.current?.abort();

  const openCall = (path: "/call" | "/voice") =>
    router.push({ pathname: path, params: conversationId ? { conversationId } : {} });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Stack.Screen
        options={{
          title: title ?? t.home.chat,
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 18 }}>
              <Pressable onPress={() => openCall("/voice")} accessibilityLabel={t.chat.callVoice} hitSlop={8}>
                <Icon name="mic-outline" color={colors.accent} />
              </Pressable>
              <Pressable onPress={() => openCall("/call")} accessibilityLabel={t.chat.callVideo} hitSlop={8}>
                <Icon name="videocam-outline" color={colors.accent} />
              </Pressable>
            </View>
          ),
        }}
      />
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />
      ) : (
        <FlatList
          ref={list}
          data={items}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: space.md, gap: space.sm, flexGrow: 1 }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="chatbubbles-outline" size={42} color={colors.textSecondary} />
              <Text style={[type.body, { color: colors.textSecondary }]}>{t.chat.empty}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const mine = item.role === "user";
            return (
              <View
                style={[
                  styles.bubble,
                  mine
                    ? { alignSelf: "flex-end", backgroundColor: colors.bubbleUser }
                    : { alignSelf: "flex-start", backgroundColor: colors.bubbleAi, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
                ]}
              >
                {item.text ? (
                  <Text selectable style={[type.body, { color: mine ? colors.bubbleUserText : colors.bubbleAiText }]}>
                    {item.text}
                  </Text>
                ) : (
                  <ActivityIndicator color={colors.accent} />
                )}
                {item.imageCount ? (
                  <Text style={[type.caption, { color: mine ? colors.bubbleUserText : colors.textSecondary, opacity: 0.8 }]}>
                    {t.chat.photosNote}
                  </Text>
                ) : null}
                {item.interrupted ? (
                  <Text style={[type.caption, { color: colors.textSecondary }]}>{t.chat.interrupted}</Text>
                ) : null}
              </View>
            );
          }}
        />
      )}

      {error ? (
        <View style={{ paddingHorizontal: space.md }}>
          <Banner tone="danger" text={error} />
        </View>
      ) : null}

      <View
        style={[
          styles.composer,
          { paddingBottom: Math.max(insets.bottom, space.sm), borderTopColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t.chat.placeholder}
          placeholderTextColor={colors.textSecondary}
          multiline
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        />
        <Pressable
          onPress={sending ? stop : send}
          accessibilityRole="button"
          accessibilityLabel={sending ? t.chat.stop : t.chat.send}
          disabled={!sending && !input.trim()}
          style={[styles.send, { backgroundColor: colors.accent, opacity: !sending && !input.trim() ? 0.4 : 1 }]}
        >
          <Icon name={sending ? "stop" : "arrow-up"} size={22} color={colors.accentText} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md },
  bubble: { maxWidth: "85%", borderRadius: radius.lg, paddingHorizontal: space.md, paddingVertical: 10, gap: 4 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 17,
  },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
