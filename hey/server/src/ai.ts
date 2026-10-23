import Anthropic from "@anthropic-ai/sdk";
import type { ConversationMode, IncomingImage, StoredMessage } from "./types.js";
import {
  BASE_SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
  cameraNote,
  localeInstruction,
  memoryBlock,
  modeInstructions,
} from "./prompts.js";

export interface ReplyRequest {
  mode: ConversationMode;
  locale: string;
  memories: string[];
  history: StoredMessage[];
  userText: string;
  images: IncomingImage[];
  cameraOn: boolean;
  signal: AbortSignal;
  onText: (delta: string) => void;
}

export interface ReplyResult {
  text: string;
  /** true si l'IA a refusé de répondre pour des raisons de sécurité */
  refused: boolean;
  usage: { inputTokens: number; outputTokens: number };
}

export interface SummaryResult {
  title: string;
  summary: string;
  memories: string[];
}

export interface AiService {
  reply(req: ReplyRequest): Promise<ReplyResult>;
  summarize(input: {
    history: StoredMessage[];
    knownMemories: string[];
    wantMemories: boolean;
  }): Promise<SummaryResult>;
}

type Block = Anthropic.Beta.Messages.BetaContentBlockParam;
type Msg = Anthropic.Beta.Messages.BetaMessageParam;

/** Nombre maximal de messages passés renvoyés à l'IA (contexte de la conversation). */
export const HISTORY_LIMIT = 40;

/**
 * Construit la liste de messages envoyée à l'IA.
 * - Les images passées ne sont jamais renvoyées (elles ne sont pas stockées).
 * - Chaque message utilisateur porte une note sur l'état réel de la caméra,
 *   pour que l'IA ne prétende jamais voir une image qu'elle n'a pas reçue.
 * - Les rôles consécutifs identiques sont fusionnés.
 */
export function buildMessages(req: Omit<ReplyRequest, "signal" | "onText" | "memories" | "locale">): Msg[] {
  const out: Msg[] = [];
  const push = (role: "user" | "assistant", blocks: Block[]) => {
    const last = out[out.length - 1];
    if (last && last.role === role && Array.isArray(last.content)) {
      (last.content as Block[]).push(...blocks);
    } else {
      out.push({ role, content: blocks });
    }
  };

  for (const m of req.history.slice(-HISTORY_LIMIT)) {
    if (m.role === "user") {
      push("user", [
        { type: "text", text: cameraNote({ mode: req.mode, cameraOn: false, attached: m.imageCount, past: true }) },
        { type: "text", text: m.content },
      ]);
    } else {
      const text = m.interrupted
        ? `${m.content.trim()} [réponse interrompue : l'utilisateur m'a coupé la parole ici]`
        : m.content;
      if (text.trim()) push("assistant", [{ type: "text", text }]);
    }
  }

  // L'API exige que la conversation commence par l'utilisateur
  while (out.length > 0 && out[0]!.role !== "user") out.shift();

  const current: Block[] = [];
  for (const img of req.images) {
    current.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } });
  }
  current.push({
    type: "text",
    text: cameraNote({ mode: req.mode, cameraOn: req.cameraOn, attached: req.images.length }),
  });
  current.push({ type: "text", text: req.userText });
  push("user", current);
  return out;
}

export function buildSystem(mode: ConversationMode, locale: string, memories: string[]) {
  const system: Anthropic.Beta.Messages.BetaTextBlockParam[] = [
    // Bloc stable : mis en cache
    { type: "text", text: BASE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    { type: "text", text: `${modeInstructions(mode)}\n${localeInstruction(locale)}` },
  ];
  const mem = memoryBlock(memories);
  if (mem) system.push({ type: "text", text: mem });
  return system;
}

export class ClaudeService implements AiService {
  private client: Anthropic;

  constructor(apiKey: string, private model: string) {
    this.client = new Anthropic({ apiKey, maxRetries: 2 });
  }

  async reply(req: ReplyRequest): Promise<ReplyResult> {
    const stream = this.client.beta.messages.stream(
      {
        model: this.model,
        max_tokens: 8000,
        system: buildSystem(req.mode, req.locale, req.memories),
        messages: buildMessages(req),
        // Voix : effort bas pour répondre vite ; chat écrit : un peu plus de réflexion
        output_config: { effort: req.mode === "chat" ? "medium" : "low" },
        // Si le modèle principal décline, l'API réessaie automatiquement sur un modèle de secours
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      },
      { signal: req.signal },
    );

    let text = "";
    stream.on("text", (delta) => {
      text += delta;
      req.onText(delta);
    });

    const final = await stream.finalMessage();
    return {
      text,
      refused: final.stop_reason === "refusal",
      usage: { inputTokens: final.usage.input_tokens, outputTokens: final.usage.output_tokens },
    };
  }

  async summarize(input: {
    history: StoredMessage[];
    knownMemories: string[];
    wantMemories: boolean;
  }): Promise<SummaryResult> {
    const transcript = input.history
      .slice(-30)
      .map((m) => `${m.role === "user" ? "Utilisateur" : "HEY"} : ${m.content}`)
      .join("\n");
    const known = input.knownMemories.length
      ? `\n\nFaits déjà connus (ne pas répéter) :\n${input.knownMemories.map((m) => `- ${m}`).join("\n")}`
      : "";
    const res = await this.client.beta.messages.create({
      model: this.model,
      max_tokens: 2000,
      system: SUMMARY_SYSTEM_PROMPT,
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              memories: { type: "array", items: { type: "string" } },
            },
            required: ["title", "summary", "memories"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: `Conversation :\n${transcript}${known}` }],
    });
    const raw = res.content.find((b) => b.type === "text");
    if (!raw || raw.type !== "text") throw new Error("Résumé vide");
    const parsed = JSON.parse(raw.text) as SummaryResult;
    return {
      title: String(parsed.title ?? "").slice(0, 80),
      summary: String(parsed.summary ?? "").slice(0, 400),
      memories: input.wantMemories
        ? (parsed.memories ?? []).map((m) => String(m).slice(0, 200)).slice(0, 5)
        : [],
    };
  }
}
