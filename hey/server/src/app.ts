import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import type { AiService } from "./ai.js";
import { bearerToken, type AuthUser, type AuthVerifier } from "./auth.js";
import type { Config } from "./config.js";
import type { Store } from "./store.js";
import type { StoredMessage } from "./types.js";

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser;
  }
}

export interface AppDeps {
  config: Config;
  store: Store;
  auth: AuthVerifier;
  ai: AiService;
}

const ChatBody = z.object({
  conversationId: z.string().uuid().optional(),
  mode: z.enum(["video", "voice", "chat"]),
  text: z.string().trim().min(1),
  cameraOn: z.boolean().default(false),
  locale: z.string().max(20).default("fr-FR"),
  images: z
    .array(
      z.object({
        data: z.string().min(1),
        mediaType: z.enum(["image/jpeg", "image/png"]).default("image/jpeg"),
        capturedAt: z.string().optional(),
      }),
    )
    .default([]),
});

const SettingsBody = z.object({
  memoryEnabled: z.boolean().optional(),
  language: z.string().max(20).optional(),
});

/** Début de la journée en cours (UTC) pour les quotas quotidiens. */
function startOfDay(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Titres et résumés : régénérés à ces nombres de messages. */
const SUMMARY_AT = new Set([2, 6, 12, 24, 48]);

export async function buildApp(deps: AppDeps) {
  const { config, store, auth, ai } = deps;
  const app = Fastify({
    logger: config.NODE_ENV === "test" ? false : { level: "info", redact: ["req.headers.authorization"] },
    bodyLimit: 6 * 1024 * 1024,
    trustProxy: true,
  });

  await app.register(cors, {
    origin: config.CORS_ORIGINS ? config.CORS_ORIGINS.split(",").map((s) => s.trim()) : false,
  });
  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
    keyGenerator: (req) => bearerToken(req.headers.authorization) ?? req.ip,
  });

  app.decorateRequest("user", null as unknown as AuthUser);

  const requireUser = async (req: FastifyRequest, reply: FastifyReply) => {
    const token = bearerToken(req.headers.authorization);
    const user = token ? await auth.verify(token).catch(() => null) : null;
    if (!user) {
      return reply.code(401).send({ error: "unauthorized", message: "Session expirée, reconnectez-vous." });
    }
    req.user = user;
  };

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof z.ZodError) {
      return reply.code(400).send({ error: "invalid_request", message: "Requête invalide.", details: err.issues });
    }
    const status = (err as { statusCode?: number }).statusCode;
    if (status && status < 500) {
      return reply.code(status).send({ error: "request_error", message: (err as Error).message });
    }
    req.log.error(err);
    return reply.code(500).send({ error: "server_error", message: "Erreur interne du serveur." });
  });

  app.get("/health", async () => ({ ok: true, model: config.CLAUDE_MODEL }));

  /* ----------------------------- Conversation ----------------------------- */

  app.post("/v1/chat", { preHandler: requireUser }, async (req, reply) => {
    const body = ChatBody.parse(req.body);
    const userId = req.user.id;

    if (body.text.length > config.MAX_TEXT_CHARS) {
      return reply.code(400).send({ error: "text_too_long", message: "Message trop long." });
    }
    if (body.images.length > config.MAX_IMAGES_PER_TURN) {
      return reply.code(400).send({ error: "too_many_images", message: "Trop d'images pour un seul message." });
    }
    if (body.images.some((i) => i.data.length > config.MAX_IMAGE_BASE64_CHARS)) {
      return reply.code(413).send({ error: "image_too_large", message: "Image trop volumineuse." });
    }
    if (body.mode === "voice" && body.images.length > 0) {
      return reply.code(400).send({ error: "images_not_allowed", message: "Images non autorisées dans ce mode." });
    }

    // Limites de consommation quotidiennes
    const usage = await store.usageSince(userId, startOfDay());
    if (usage.messages >= config.DAILY_MESSAGE_LIMIT) {
      return reply.code(429).send({
        error: "daily_limit",
        message: "Limite quotidienne atteinte. Revenez demain !",
      });
    }
    if (usage.images + body.images.length > config.DAILY_IMAGE_LIMIT) {
      return reply.code(429).send({
        error: "daily_image_limit",
        message: "Limite quotidienne d'images atteinte. Vous pouvez continuer sans caméra.",
      });
    }

    let conversation = body.conversationId ? await store.getConversation(userId, body.conversationId) : null;
    if (body.conversationId && !conversation) {
      return reply.code(404).send({ error: "not_found", message: "Conversation introuvable." });
    }
    conversation ??= await store.createConversation(userId, body.mode);

    const [history, settings] = await Promise.all([
      store.listMessages(userId, conversation.id, 60),
      store.getSettings(userId),
    ]);
    const memories = settings.memoryEnabled ? (await store.listMemories(userId)).map((m) => m.content) : [];

    await store.addMessage({
      userId,
      conversationId: conversation.id,
      role: "user",
      content: body.text,
      imageCount: body.images.length,
    });

    // --- Réponse en flux (Server-Sent Events) ---
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      // En-têtes déjà préparés par Fastify (CORS, limite de débit…)
      ...(reply.getHeaders() as Record<string, string>),
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    const send = (event: string, data: unknown) => {
      if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const abort = new AbortController();
    // L'utilisateur coupe la parole ou raccroche : on arrête immédiatement la génération
    res.on("close", () => {
      if (!res.writableFinished) abort.abort();
    });
    const keepAlive = setInterval(() => res.write(": ping\n\n"), 15_000);

    send("meta", { conversationId: conversation.id });

    let text = "";
    let interrupted = false;
    try {
      const result = await ai.reply({
        mode: body.mode,
        locale: body.locale,
        memories,
        history,
        userText: body.text,
        images: body.images,
        cameraOn: body.cameraOn,
        signal: abort.signal,
        onText: (delta) => {
          text += delta;
          send("delta", { text: delta });
        },
      });
      text = result.text;
      if (result.refused && !text.trim()) {
        text = "Désolé, je ne peux pas t'aider sur ce point. Est-ce que je peux t'aider autrement ?";
        send("delta", { text });
      }
    } catch (err) {
      if (abort.signal.aborted) {
        interrupted = true;
      } else {
        req.log.error(err);
        send("error", { error: "ai_error", message: "HEY n'a pas pu répondre. Réessaie dans un instant." });
      }
    } finally {
      clearInterval(keepAlive);
    }

    let saved: StoredMessage | null = null;
    if (text.trim()) {
      saved = await store
        .addMessage({ userId, conversationId: conversation.id, role: "assistant", content: text, interrupted })
        .catch((e) => {
          req.log.error(e);
          return null;
        });
    }
    send("done", { conversationId: conversation.id, messageId: saved?.id ?? null, interrupted });
    res.end();

    // Titre, résumé et mémoire : en arrière-plan, sans retarder la réponse
    const count = history.length + 2;
    if (saved && (SUMMARY_AT.has(count) || !conversation.title)) {
      void refreshSummary(userId, conversation.id, settings.memoryEnabled).catch((e) => req.log.warn(e));
    }
  });

  async function refreshSummary(userId: string, conversationId: string, memoryEnabled: boolean) {
    const [history, known] = await Promise.all([
      store.listMessages(userId, conversationId, 60),
      memoryEnabled ? store.listMemories(userId) : Promise.resolve([]),
    ]);
    const result = await ai.summarize({
      history,
      knownMemories: known.map((m) => m.content),
      wantMemories: memoryEnabled,
    });
    await store.updateConversation(userId, conversationId, {
      title: result.title || null,
      summary: result.summary || null,
    });
    if (memoryEnabled && result.memories.length) {
      const existing = new Set(known.map((m) => m.content.toLowerCase()));
      await store.addMemories(
        userId,
        result.memories.filter((m) => m.trim() && !existing.has(m.toLowerCase())),
      );
    }
  }

  /* ------------------------------ Historique ------------------------------ */

  app.get("/v1/conversations", { preHandler: requireUser }, async (req) => {
    const conversations = await store.listConversations(req.user.id, 100);
    return { conversations };
  });

  app.get<{ Params: { id: string } }>("/v1/conversations/:id", { preHandler: requireUser }, async (req, reply) => {
    const conversation = await store.getConversation(req.user.id, req.params.id);
    if (!conversation) return reply.code(404).send({ error: "not_found", message: "Conversation introuvable." });
    const messages = await store.listMessages(req.user.id, conversation.id, 500);
    return { conversation, messages };
  });

  app.delete<{ Params: { id: string } }>("/v1/conversations/:id", { preHandler: requireUser }, async (req, reply) => {
    const ok = await store.deleteConversation(req.user.id, req.params.id);
    if (!ok) return reply.code(404).send({ error: "not_found", message: "Conversation introuvable." });
    return { ok: true };
  });

  /* ------------------------- Paramètres et mémoire ------------------------ */

  app.get("/v1/me", { preHandler: requireUser }, async (req) => {
    const [settings, usage] = await Promise.all([
      store.getSettings(req.user.id),
      store.usageSince(req.user.id, startOfDay()),
    ]);
    return {
      user: req.user,
      settings,
      usage: { ...usage, dailyMessageLimit: config.DAILY_MESSAGE_LIMIT, dailyImageLimit: config.DAILY_IMAGE_LIMIT },
    };
  });

  app.put("/v1/me/settings", { preHandler: requireUser }, async (req) => {
    const patch = SettingsBody.parse(req.body);
    const settings = await store.updateSettings(req.user.id, patch);
    return { settings };
  });

  app.get("/v1/me/memories", { preHandler: requireUser }, async (req) => ({
    memories: await store.listMemories(req.user.id),
  }));

  app.delete<{ Params: { id: string } }>("/v1/me/memories/:id", { preHandler: requireUser }, async (req, reply) => {
    const ok = await store.deleteMemory(req.user.id, req.params.id);
    if (!ok) return reply.code(404).send({ error: "not_found", message: "Souvenir introuvable." });
    return { ok: true };
  });

  app.delete("/v1/me/memories", { preHandler: requireUser }, async (req) => {
    await store.deleteAllMemories(req.user.id);
    return { ok: true };
  });

  /* --------------------------------- RGPD --------------------------------- */

  app.get("/v1/me/export", { preHandler: requireUser }, async (req) => {
    const userId = req.user.id;
    const conversations = await store.listConversations(userId, 10_000);
    const full = await Promise.all(
      conversations.map(async (c) => ({ ...c, messages: await store.listMessages(userId, c.id, 10_000) })),
    );
    return {
      exportedAt: new Date().toISOString(),
      user: req.user,
      settings: await store.getSettings(userId),
      memories: await store.listMemories(userId),
      conversations: full,
      note: "Les flux audio et vidéo ne sont jamais enregistrés par HEY.",
    };
  });

  app.delete("/v1/me", { preHandler: requireUser }, async (req) => {
    await store.deleteAllUserData(req.user.id);
    await auth.deleteUser(req.user.id);
    return { ok: true };
  });

  return app;
}
