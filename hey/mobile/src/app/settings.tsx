import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Share, View } from "react-native";
import { Banner, Caption, Card, Icon, Row, SectionTitle, Segmented, ToggleRow } from "@/components/ui";
import { useApp, type ThemePreference } from "@/context/app";
import { LOCALES, type Locale } from "@/i18n";
import { ApiError, api, type Memory } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { space } from "@/theme/tokens";

export default function Settings() {
  const { colors, prefs, setPrefs, t } = useApp();
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [usage, setUsage] = useState<{ messages: number; dailyMessageLimit: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : t.common.error);

  const load = useCallback(
    () =>
      Promise.all([api.me(), api.listMemories()])
        .then(([me, mem]) => {
          setMemoryEnabled(me.settings.memoryEnabled);
          setUsage(me.usage);
          setMemories(mem.memories);
          setError(null);
        })
        .catch((e) => setError(e instanceof ApiError ? e.message : t.common.error)),
    [t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const toggleMemory = async (value: boolean) => {
    setMemoryEnabled(value);
    try {
      await api.updateSettings({ memoryEnabled: value });
    } catch (e) {
      setMemoryEnabled(!value);
      fail(e);
    }
  };

  const setLocale = (locale: Locale) => {
    setPrefs({ locale });
    api.updateSettings({ language: locale }).catch(() => {});
  };

  const exportData = async () => {
    try {
      const data = await api.exportData();
      await Share.share({ message: JSON.stringify(data, null, 2), title: "HEY export" });
    } catch (e) {
      fail(e);
    }
  };

  const deleteAccount = () =>
    Alert.alert(t.settings.deleteAccount, t.settings.deleteAccountConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteAccount();
            await supabase.auth.signOut();
          } catch (e) {
            fail(e);
          }
        },
      },
    ]);

  return (
    <ScrollView contentContainerStyle={{ padding: space.md, paddingBottom: space.xxl }}>
      {error ? <Banner tone="danger" text={error} action={{ label: t.common.retry, onPress: load }} /> : null}

      <SectionTitle>{t.settings.appearance}</SectionTitle>
      <Segmented<ThemePreference>
        value={prefs.theme}
        onChange={(theme) => setPrefs({ theme })}
        options={[
          { value: "system", label: t.settings.themeSystem },
          { value: "light", label: t.settings.themeLight },
          { value: "dark", label: t.settings.themeDark },
        ]}
      />

      <SectionTitle>{t.settings.language}</SectionTitle>
      <Segmented<Locale> value={prefs.locale} onChange={setLocale} options={LOCALES.map((l) => ({ value: l.id, label: l.label }))} />

      <SectionTitle>{t.settings.voice}</SectionTitle>
      <Card>
        <ToggleRow
          icon="hand-left-outline"
          label={t.settings.bargeIn}
          detail={t.settings.bargeInHelp}
          value={prefs.bargeIn}
          onChange={(bargeIn) => setPrefs({ bargeIn })}
        />
      </Card>
      <Caption style={{ marginTop: space.md, marginLeft: space.sm }}>{t.settings.speechRate}</Caption>
      <Segmented<number>
        value={prefs.speechRate}
        onChange={(speechRate) => setPrefs({ speechRate })}
        options={[
          { value: 0.85, label: t.settings.slow },
          { value: 1.0, label: t.settings.normal },
          { value: 1.15, label: t.settings.fast },
        ]}
      />

      <SectionTitle>{t.settings.privacy}</SectionTitle>
      <Card>
        <ToggleRow
          icon="sparkles-outline"
          label={t.settings.memory}
          detail={t.settings.memoryHelp}
          value={memoryEnabled}
          onChange={toggleMemory}
        />
      </Card>

      {memoryEnabled || memories.length > 0 ? (
        <>
          <SectionTitle>{t.settings.memories}</SectionTitle>
          <Card>
            {memories.length === 0 ? (
              <Row label={t.settings.noMemories} />
            ) : (
              memories.map((m) => (
                <Row
                  key={m.id}
                  label={m.content}
                  right={
                    <Pressable
                      hitSlop={10}
                      accessibilityLabel={t.common.delete}
                      onPress={async () => {
                        try {
                          await api.deleteMemory(m.id);
                          setMemories((prev) => prev.filter((x) => x.id !== m.id));
                        } catch (e) {
                          fail(e);
                        }
                      }}
                    >
                      <Icon name="close-circle" size={20} color={colors.textSecondary} />
                    </Pressable>
                  }
                />
              ))
            )}
            {memories.length > 0 ? (
              <Row
                icon="trash-outline"
                danger
                label={t.settings.forgetAll}
                onPress={async () => {
                  try {
                    await api.deleteAllMemories();
                    setMemories([]);
                  } catch (e) {
                    fail(e);
                  }
                }}
              />
            ) : null}
          </Card>
        </>
      ) : null}

      <Caption style={{ marginTop: space.md, marginHorizontal: space.sm, lineHeight: 18 }}>{t.settings.privacyNote}</Caption>

      <View style={{ height: space.md }} />
      <Card>
        {usage ? (
          <Row icon="speedometer-outline" label={t.settings.usage} detail={`${usage.messages} / ${usage.dailyMessageLimit}`} />
        ) : null}
        <Row icon="download-outline" label={t.settings.export} onPress={exportData} />
        <Row icon="log-out-outline" label={t.settings.signOut} onPress={() => void supabase.auth.signOut()} />
        <Row icon="warning-outline" danger label={t.settings.deleteAccount} onPress={deleteAccount} />
      </Card>
    </ScrollView>
  );
}
