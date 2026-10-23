import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { HeyOrb } from "@/components/hey-orb";
import { Banner, Body, Button, Caption, Field, Screen, Title } from "@/components/ui";
import { useApp } from "@/context/app";
import { isConfigured } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { space } from "@/theme/tokens";

/** Traduit les messages d'erreur courants de Supabase. */
function authMessage(message: string, locale: string): string {
  if (!locale.startsWith("fr")) return message;
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou mot de passe incorrect.";
  if (m.includes("email not confirmed")) return "Adresse e-mail non confirmée. Ouvrez l'e-mail de confirmation reçu.";
  if (m.includes("already registered")) return "Un compte existe déjà avec cette adresse.";
  if (m.includes("password should be")) return "Mot de passe trop court (6 caractères minimum).";
  if (m.includes("rate limit")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  return message;
}

export default function Login() {
  const { colors, prefs, t } = useApp();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "danger" | "info" } | null>(null);

  const submit = async () => {
    setLoading(true);
    setMessage(null);
    try {
      if (mode === "signIn") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setMessage({ text: authMessage(error.message, prefs.locale), tone: "danger" });
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) setMessage({ text: authMessage(error.message, prefs.locale), tone: "danger" });
        else if (!data.session) {
          setMessage({ text: t.auth.checkEmail, tone: "info" });
          setMode("signIn");
        }
      }
    } catch {
      setMessage({ text: t.home.serverDown, tone: "danger" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center" }}>
            <HeyOrb size={110} status="idle" label="HEY" />
          </View>
          <Title style={{ textAlign: "center" }}>{t.auth.title}</Title>
          <Body secondary style={{ textAlign: "center" }}>
            {t.auth.subtitle}
          </Body>

          {!isConfigured ? <Banner tone="danger" text={t.auth.notConfigured} /> : null}
          {message ? <Banner tone={message.tone} text={message.text} /> : null}

          <Field
            placeholder={t.auth.email}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            placeholder={t.auth.password}
            secureTextEntry
            autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            textContentType={mode === "signIn" ? "password" : "newPassword"}
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
          />
          <Button
            label={mode === "signIn" ? t.auth.signIn : t.auth.signUp}
            onPress={submit}
            loading={loading}
            disabled={!email.includes("@") || password.length < 6 || !isConfigured}
          />
          <Pressable onPress={() => setMode(mode === "signIn" ? "signUp" : "signIn")} hitSlop={8}>
            <Text style={{ color: colors.accent, textAlign: "center", fontWeight: "600" }}>
              {mode === "signIn" ? t.auth.switchToSignUp : t.auth.switchToSignIn}
            </Text>
          </Pressable>
          <Caption style={{ textAlign: "center", marginTop: space.md }}>{t.auth.consent}</Caption>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md, flexGrow: 1, justifyContent: "center" },
});
