// Serveur de démonstration pour les tests de bout en bout : vraie API HEY, IA simulée.
import { buildApp } from "../src/app.js";
import { DevAuthVerifier } from "../src/auth.js";
import { loadConfig } from "../src/config.js";
import { MemoryStore } from "../src/store.js";
import type { AiService } from "../src/ai.js";

const ai: AiService = {
  async reply(req) {
    const text = "D'accord ! Avant tout, ferme l'arrivée d'eau sous l'évier. Ensuite, dis-moi si la fuite vient du raccord ou du flexible.";
    for (const w of text.split(/(?<= )/)) {
      if (req.signal.aborted) throw new Error("aborted");
      req.onText(w);
      await new Promise((r) => setTimeout(r, 15));
    }
    return { text, refused: false, usage: { inputTokens: 0, outputTokens: 0 } };
  },
  async summarize() {
    return { title: "Fuite sous l'évier", summary: "Robinet de cuisine qui fuit au niveau du raccord.", memories: [] };
  },
};

const app = await buildApp({
  config: loadConfig({ NODE_ENV: "test", CORS_ORIGINS: "http://127.0.0.1:8099" }),
  store: new MemoryStore(),
  auth: new DevAuthVerifier(),
  ai,
});
await app.listen({ port: Number(process.env.PORT ?? 8787), host: "127.0.0.1" });
console.log("e2e server ready");
