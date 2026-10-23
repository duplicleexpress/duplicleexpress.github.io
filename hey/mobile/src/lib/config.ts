/**
 * Configuration publique de l'application (fichier mobile/.env).
 * Aucune de ces valeurs n'est secrète : la clé "anon" de Supabase est prévue pour être publique
 * et protégée par les règles de sécurité de la base. La clé de l'IA reste sur le serveur.
 */
export const config = {
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, ""),
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export const isConfigured = Boolean(config.apiUrl && config.supabaseUrl && config.supabaseAnonKey);
