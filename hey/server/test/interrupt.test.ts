import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { DevAuthVerifier } from "../src/auth.js";
import { loadConfig } from "../src/config.js";
import { MemoryStore } from "../src/store.js";
import type { AiService, ReplyRequest } from "../src/ai.js";

/** IA factice qui parle lentement, mot par mot, jusqu'à être interrompue. */
class SlowAi implements AiService {
  aborted = false;
  async reply(req: ReplyRequest) {
    let text = "";
    for (let i = 0; i < 200; i++) {
      if (req.signal.aborted) {
        this.aborted = true;
        throw new Error("aborted");
      }
      const w = `mot${i} `;
      text += w;
      req.onText(w);
      await new Promise((r) => setTimeout(r, 10));
    }
    return { text, refused: false, usage: { inputTokens: 0, outputTokens: 0 } };
  }
  async summarize() {
    return { title: "t", summary: "s", memories: [] };
  }
}

describe("interruption", () => {
  it("arrête la génération quand l'application coupe la connexion et garde la réponse partielle", async () => {
    const store = new MemoryStore();
    const ai = new SlowAi();
    const app = await buildApp({ config: loadConfig({ NODE_ENV: "test" }), store, auth: new DevAuthVerifier(), ai });
    await app.listen({ port: 0, host: "127.0.0.1" });
    const { port } = app.server.address() as { port: number };

    const ctrl = new AbortController();
    const res = await fetch(`http://127.0.0.1:${port}/v1/chat`, {
      method: "POST",
      headers: { authorization: "Bearer dev-alice", "content-type": "application/json" },
      body: JSON.stringify({ mode: "voice", text: "Explique-moi" }),
      signal: ctrl.signal,
    });
    const reader = res.body!.getReader();
    let received = "";
    while (!received.includes("mot3 ")) received += new TextDecoder().decode((await reader.read()).value);
    const conversationId = /"conversationId":"([^"]+)"/.exec(received)![1]!;
    ctrl.abort();

    await new Promise((r) => setTimeout(r, 100));
    expect(ai.aborted).toBe(true);
    const messages = await store.listMessages((await new DevAuthVerifier().verify("dev-alice"))!.id, conversationId);
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(messages[1]!.interrupted).toBe(true);
    expect(messages[1]!.content.split(" ").length).toBeLessThan(50);
    await app.close();
  });
});
