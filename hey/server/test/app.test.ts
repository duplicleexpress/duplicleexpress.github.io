import { describe, expect, it, beforeEach } from "vitest";
import { buildApp } from "../src/app.js";
import { DevAuthVerifier } from "../src/auth.js";
import { loadConfig } from "../src/config.js";
import { MemoryStore } from "../src/store.js";
import type { AiService, ReplyRequest } from "../src/ai.js";

class FakeAi implements AiService {
  calls: ReplyRequest[] = [];
  summaries = 0;
  constructor(private answer = "Ferme d'abord l'arrivée d'eau. Ensuite, montre-moi le raccord.") {}
  async reply(req: ReplyRequest) {
    this.calls.push(req);
    for (const part of this.answer.split(/(?<=\. )/)) req.onText(part);
    return { text: this.answer, refused: false, usage: { inputTokens: 1, outputTokens: 1 } };
  }
  async summarize() {
    this.summaries++;
    return { title: "Fuite sous l'évier", summary: "Robinet qui fuit.", memories: ["Débutant en bricolage"] };
  }
}

function parseSse(body: string) {
  return body
    .split("\n\n")
    .filter((chunk) => chunk.startsWith("event:"))
    .map((chunk) => {
      const [ev, data] = chunk.split("\n");
      return { event: ev!.slice(7), data: JSON.parse(data!.slice(6)) };
    });
}

const auth = { authorization: "Bearer dev-alice" };
const bob = { authorization: "Bearer dev-bob" };

describe("API HEY", () => {
  let store: MemoryStore;
  let ai: FakeAi;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    store = new MemoryStore();
    ai = new FakeAi();
    app = await buildApp({
      config: loadConfig({ NODE_ENV: "test", DAILY_MESSAGE_LIMIT: "3" }),
      store,
      auth: new DevAuthVerifier(),
      ai,
    });
  });

  it("refuse les requêtes sans authentification", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/conversations" });
    expect(res.statusCode).toBe(401);
  });

  it("répond en flux et enregistre la conversation", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/chat",
      headers: auth,
      payload: {
        mode: "video",
        text: "Hey, regarde, mon robinet fuit.",
        cameraOn: true,
        images: [{ data: "aGVsbG8=", mediaType: "image/jpeg" }],
      },
    });
    expect(res.statusCode).toBe(200);
    const events = parseSse(res.body);
    expect(events[0]!.event).toBe("meta");
    const text = events.filter((e) => e.event === "delta").map((e) => e.data.text).join("");
    expect(text).toContain("arrivée d'eau");
    expect(events.at(-1)!.event).toBe("done");

    // L'IA a bien reçu l'image et l'état de la caméra
    expect(ai.calls[0]!.images).toHaveLength(1);
    expect(ai.calls[0]!.cameraOn).toBe(true);

    const conversationId = events[0]!.data.conversationId;
    const detail = await app.inject({ method: "GET", url: `/v1/conversations/${conversationId}`, headers: auth });
    const { messages } = detail.json();
    expect(messages.map((m: { role: string }) => m.role)).toEqual(["user", "assistant"]);
    // L'image n'est pas stockée, seulement le nombre d'images
    expect(messages[0].imageCount).toBe(1);
    expect(JSON.stringify(messages)).not.toContain("aGVsbG8=");
  });

  it("reprend une conversation existante avec son historique", async () => {
    const first = parseSse(
      (await app.inject({ method: "POST", url: "/v1/chat", headers: auth, payload: { mode: "chat", text: "Bonjour" } }))
        .body,
    );
    const conversationId = first[0]!.data.conversationId;
    await app.inject({ method: "POST", url: "/v1/chat", headers: auth, payload: { mode: "voice", text: "Et ensuite ?", conversationId } });
    expect(ai.calls[1]!.history.map((m) => [m.role, m.content])).toEqual([
      ["user", "Bonjour"],
      ["assistant", "Ferme d'abord l'arrivée d'eau. Ensuite, montre-moi le raccord."],
    ]);
  });

  it("isole les données entre utilisateurs", async () => {
    const first = parseSse(
      (await app.inject({ method: "POST", url: "/v1/chat", headers: auth, payload: { mode: "chat", text: "Secret" } }))
        .body,
    );
    const id = first[0]!.data.conversationId;
    expect((await app.inject({ method: "GET", url: `/v1/conversations/${id}`, headers: bob })).statusCode).toBe(404);
    expect((await app.inject({ method: "DELETE", url: `/v1/conversations/${id}`, headers: bob })).statusCode).toBe(404);
    const res = await app.inject({ method: "POST", url: "/v1/chat", headers: bob, payload: { mode: "chat", text: "x", conversationId: id } });
    expect(res.statusCode).toBe(404);
  });

  it("applique la limite quotidienne", async () => {
    for (let i = 0; i < 3; i++) {
      await app.inject({ method: "POST", url: "/v1/chat", headers: auth, payload: { mode: "chat", text: `msg ${i}` } });
    }
    const res = await app.inject({ method: "POST", url: "/v1/chat", headers: auth, payload: { mode: "chat", text: "encore" } });
    expect(res.statusCode).toBe(429);
    expect(res.json().error).toBe("daily_limit");
  });

  it("refuse trop d'images et les images en mode vocal", async () => {
    const img = { data: "aGVsbG8=", mediaType: "image/jpeg" };
    const tooMany = await app.inject({
      method: "POST", url: "/v1/chat", headers: auth,
      payload: { mode: "video", text: "x", images: [img, img, img] },
    });
    expect(tooMany.statusCode).toBe(400);
    const voice = await app.inject({ method: "POST", url: "/v1/chat", headers: auth, payload: { mode: "voice", text: "x", images: [img] } });
    expect(voice.statusCode).toBe(400);
  });

  it("supprime une conversation", async () => {
    const first = parseSse(
      (await app.inject({ method: "POST", url: "/v1/chat", headers: auth, payload: { mode: "chat", text: "Bonjour" } }))
        .body,
    );
    const id = first[0]!.data.conversationId;
    expect((await app.inject({ method: "DELETE", url: `/v1/conversations/${id}`, headers: auth })).statusCode).toBe(200);
    const list = await app.inject({ method: "GET", url: "/v1/conversations", headers: auth });
    expect(list.json().conversations).toHaveLength(0);
  });

  it("génère titre et mémoire seulement si la mémoire est activée", async () => {
    await app.inject({ method: "PUT", url: "/v1/me/settings", headers: auth, payload: { memoryEnabled: true } });
    await app.inject({ method: "POST", url: "/v1/chat", headers: auth, payload: { mode: "chat", text: "Je débute" } });
    await new Promise((r) => setTimeout(r, 20));
    const list = (await app.inject({ method: "GET", url: "/v1/conversations", headers: auth })).json();
    expect(list.conversations[0].title).toBe("Fuite sous l'évier");
    const mem = (await app.inject({ method: "GET", url: "/v1/me/memories", headers: auth })).json();
    expect(mem.memories.map((m: { content: string }) => m.content)).toEqual(["Débutant en bricolage"]);

    // Bob n'a pas activé la mémoire : rien n'est retenu
    await app.inject({ method: "POST", url: "/v1/chat", headers: bob, payload: { mode: "chat", text: "Je débute" } });
    await new Promise((r) => setTimeout(r, 20));
    const memBob = (await app.inject({ method: "GET", url: "/v1/me/memories", headers: bob })).json();
    expect(memBob.memories).toHaveLength(0);
  });

  it("exporte puis efface toutes les données (RGPD)", async () => {
    await app.inject({ method: "POST", url: "/v1/chat", headers: auth, payload: { mode: "chat", text: "Bonjour" } });
    const exp = (await app.inject({ method: "GET", url: "/v1/me/export", headers: auth })).json();
    expect(exp.conversations).toHaveLength(1);
    expect((await app.inject({ method: "DELETE", url: "/v1/me", headers: auth })).statusCode).toBe(200);
    const list = (await app.inject({ method: "GET", url: "/v1/conversations", headers: auth })).json();
    expect(list.conversations).toHaveLength(0);
  });

  it("valide les requêtes", async () => {
    const res = await app.inject({ method: "POST", url: "/v1/chat", headers: auth, payload: { mode: "fax", text: "" } });
    expect(res.statusCode).toBe(400);
  });
});
