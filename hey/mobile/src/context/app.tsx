import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { getStrings, type Locale, type Strings } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { palette, type Colors } from "@/theme/tokens";

export type ThemePreference = "system" | "light" | "dark";

/** Préférences stockées sur le téléphone uniquement. */
export interface LocalPrefs {
  theme: ThemePreference;
  locale: Locale;
  bargeIn: boolean;
  speechRate: number;
  speakerOn: boolean;
}

const DEFAULT_PREFS: LocalPrefs = {
  theme: "system",
  locale: "fr-FR",
  bargeIn: true,
  speechRate: 1.0,
  speakerOn: true,
};

const PREFS_KEY = "hey.prefs.v1";

interface AppContextValue {
  prefs: LocalPrefs;
  setPrefs: (patch: Partial<LocalPrefs>) => void;
  colors: Colors;
  isDark: boolean;
  t: Strings;
  session: Session | null;
  authReady: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [prefs, setPrefsState] = useState<LocalPrefs>(DEFAULT_PREFS);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => raw && setPrefsState({ ...DEFAULT_PREFS, ...JSON.parse(raw) }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setAuthReady(true));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const setPrefs = useCallback((patch: Partial<LocalPrefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const isDark = prefs.theme === "system" ? system === "dark" : prefs.theme === "dark";

  const value = useMemo<AppContextValue>(
    () => ({
      prefs,
      setPrefs,
      colors: isDark ? palette.dark : palette.light,
      isDark,
      t: getStrings(prefs.locale),
      session,
      authReady,
    }),
    [prefs, setPrefs, isDark, session, authReady],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp doit être utilisé dans <AppProvider>");
  return ctx;
}
