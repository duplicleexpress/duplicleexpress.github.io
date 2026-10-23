import { fetch as expoFetch } from "expo/fetch";
import { config } from "./config";
import { SseParser } from "./sse";
import { supabase } from "./supabase";

export type ConversationMode = "video" | "voice" | "chat";

export interface Conversation {
  id: string;
  title: string | null;
  summary: string | null;
  mode: ConversationMode;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageCount: number;
  interrupted: boolean;
  createdAt: string;
}

export interface Memory {
  id: string;
  content: string;
  createdAt: string;
}

export interface ServerSettings {
  memoryEnabled: boolean;
  language: string;
}

export interface FrameImage {
  data: string;
  mediaType: "image/jpeg";
  capturedAt: string;
}

/** Erreur lisible par l'utilisateur. `offline` = problème de réseau. */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status = 0,
  ) {
    super(message);
  }
  get offline() {
    return this.code === "network";
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError("Session expirée, reconnectez-vous.", "unauthorized", 401);
  return { Authorization: `Bearer ${token}` };
}

async function toApiError(res: { status: number; text(): Promise<string> }): Promise<ApiError> {
  let body: { error?: string; message?: string } = {};
  try {
    body = JSON.parse(await res.text());
  } catch {}
  return new ApiError(body.message ?? `Erreur du serveur (${res.status}).`, body.error ?? "http_error", res.status);
}

const NETWORK_MESSAGE = "Connexion impossible. Vérifiez votre réseau.";

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!config.apiUrl) throw new ApiError("Adresse du serveur non configurée.", "not_configured");
  const headers: Record<string, string> = { ...(await authHeader()) };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(NETWORK_MESSAGE, "network");
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as T;
}

export const api = {
  health: async () => {
    try {
      const res = await fetch(`${config.apiUrl}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },
  listConversations: () => request<{ conversations: Conversation[] }>("/v1/conversations"),
  getConversation: (id: string) =>
    request<{ conversation: Conversation; messages: Message[] }>(`/v1/conversations/${id}`),
  deleteConversation: (id: string) => request<{ ok: true }>(`/v1/conversations/${id}`, { method: "DELETE" }),
  me: () =>
    request<{
      user: { id: string; email: string | null };
      settings: ServerSettings;
      usage: { messages: number; images: number; dailyMessageLimit: number; dailyImageLimit: number };
    }>("/v1/me"),
  updateSettings: (patch: Partial<ServerSettings>) =>
    request<{ settings: ServerSettings }>("/v1/me/settings", { method: "PUT", body: patch }),
  listMemories: () => request<{ memories: Memory[] }>("/v1/me/memories"),
  deleteMemory: (id: string) => request<{ ok: true }>(`/v1/me/memories/${id}`, { method: "DELETE" }),
  deleteAllMemories: () => request<{ ok: true }>("/v1/me/memories", { method: "DELETE" }),
  exportData: () => request<unknown>("/v1/me/export"),
  deleteAccount: () => request<{ ok: true }>("/v1/me", { method: "DELETE" }),
};

export interface ChatRequest {
  conversationId?: string;
  mode: ConversationMode;
  text: string;
  cameraOn: boolean;
  locale: string;
  images: FrameImage[];
}

export interface ChatHandlers {
  onConversation?: (id: string) => void;
  onDelta: (text: string) => void;
}

/**
 * Envoie un message et reçoit la réponse de HEY en flux, mot après mot.
 * `signal` permet d'interrompre immédiatement (l'utilisateur coupe la parole).
 */
export async function streamChat(
  req: ChatRequest,
  handlers: ChatHandlers,
  signal: AbortSignal,
): Promise<{ conversationId: string | null; interrupted: boolean }> {
  if (!config.apiUrl) throw new ApiError("Adresse du serveur non configurée.", "not_configured");
  const headers = { ...(await authHeader()), "Content-Type": "application/json", Accept: "text/event-stream" };

  let res: Awaited<ReturnType<typeof expoFetch>>;
  try {
    res = await expoFetch(`${config.apiUrl}/v1/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify(req),
      signal,
    });
  } catch {
    if (signal.aborted) return { conversationId: req.conversationId ?? null, interrupted: true };
    throw new ApiError(NETWORK_MESSAGE, "network");
  }
  if (!res.ok) throw await toApiError(res);
  if (!res.body) throw new ApiError("Réponse vide du serveur.", "empty");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parser = new SseParser();
  let conversationId = req.conversationId ?? null;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      for (const ev of parser.push(decoder.decode(value, { stream: true }))) {
        const data = JSON.parse(ev.data);
        if (ev.event === "meta" && data.conversationId) {
          conversationId = data.conversationId;
          handlers.onConversation?.(data.conversationId);
        } else if (ev.event === "delta") {
          handlers.onDelta(data.text);
        } else if (ev.event === "error") {
          throw new ApiError(data.message, data.error ?? "ai_error");
        }
      }
    }
  } catch (e) {
    if (signal.aborted) return { conversationId, interrupted: true };
    if (e instanceof ApiError) throw e;
    throw new ApiError("La connexion a été interrompue.", "network");
  }
  return { conversationId, interrupted: false };
}
