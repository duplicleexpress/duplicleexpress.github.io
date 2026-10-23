import { describe, expect, it } from "vitest";
import { buildMessages, buildSystem } from "../src/ai.js";
import type { StoredMessage } from "../src/types.js";

const msg = (role: "user" | "assistant", content: string, extra: Partial<StoredMessage> = {}): StoredMessage => ({
  id: Math.random().toString(),
  conversationId: "c",
  userId: "u",
  role,
  content,
  imageCount: 0,
  interrupted: false,
  createdAt: new Date().toISOString(),
  ...extra,
});

const texts = (blocks: unknown) =>
  (blocks as { type: string; text?: string }[]).filter((b) => b.type === "text").map((b) => b.text);

describe("buildMessages", () => {
  it("joint les images du message en cours et indique l'état de la caméra", () => {
    const out = buildMessages({
      mode: "video",
      history: [],
      userText: "Regarde",
      images: [{ data: "abc", mediaType: "image/jpeg" }],
      cameraOn: true,
    });
    expect(out).toHaveLength(1);
    const content = out[0]!.content as { type: string }[];
    expect(content[0]!.type).toBe("image");
    expect(texts(content)[0]).toContain("1 image caméra jointe");
  });

  it("dit explicitement à l'IA qu'elle ne voit rien quand la caméra est coupée", () => {
    const out = buildMessages({ mode: "video", history: [], userText: "Tu vois ?", images: [], cameraOn: false });
    expect(texts(out[0]!.content)[0]).toContain("Tu ne vois rien");
  });

  it("ne renvoie jamais les images passées mais signale leur existence", () => {
    const out = buildMessages({
      mode: "video",
      history: [msg("user", "Mon robinet", { imageCount: 2 }), msg("assistant", "Je vois une fuite.")],
      userText: "Et maintenant ?",
      images: [],
      cameraOn: true,
    });
    expect(out.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(JSON.stringify(out)).not.toContain('"image"');
    expect(texts(out[0]!.content)[0]).toContain("ne te sont plus montrées");
  });

  it("signale une réponse interrompue et fusionne les rôles consécutifs", () => {
    const out = buildMessages({
      mode: "voice",
      history: [
        msg("assistant", "orphelin"),
        msg("user", "A"),
        msg("assistant", "Alors d'abord", { interrupted: true }),
        msg("user", "B"),
        msg("user", "C"),
      ],
      userText: "D",
      images: [],
      cameraOn: false,
    });
    expect(out.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(texts(out[1]!.content)[0]).toContain("interrompue");
    expect(texts(out[2]!.content)).toContain("D");
  });
});

describe("buildSystem", () => {
  it("n'inclut la mémoire que si elle existe", () => {
    expect(buildSystem("chat", "fr-FR", [])).toHaveLength(2);
    const withMem = buildSystem("chat", "fr-FR", ["Possède une 208"]);
    expect(withMem).toHaveLength(3);
    expect(withMem[2]!.text).toContain("208");
  });
});
