import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { ClaudeService } from "./ai.js";
import { buildApp } from "./app.js";
import { DevAuthVerifier, SupabaseAuthVerifier, type AuthVerifier } from "./auth.js";
import { loadConfig } from "./config.js";
import { MemoryStore, SupabaseStore, type Store } from "./store.js";

const config = loadConfig();

if (!config.ANTHROPIC_API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY manquante. Copiez .env.example en .env et ajoutez votre clé.");
  process.exit(1);
}

let store: Store;
let auth: AuthVerifier;

if (config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY) {
  const supabaseStore = new SupabaseStore(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
  store = supabaseStore;
  auth = new SupabaseAuthVerifier(
    createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  );
} else if (config.ALLOW_DEV_AUTH) {
  console.warn("⚠️  Mode développement : pas de Supabase, données en mémoire (perdues au redémarrage).");
  store = new MemoryStore();
  auth = new DevAuthVerifier();
} else {
  console.error("❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquants (ou activez ALLOW_DEV_AUTH=true en local).");
  process.exit(1);
}

const app = await buildApp({
  config,
  store,
  auth,
  ai: new ClaudeService(config.ANTHROPIC_API_KEY, config.CLAUDE_MODEL),
});

await app.listen({ port: config.PORT, host: config.HOST });

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    void app.close().then(() => process.exit(0));
  });
}
