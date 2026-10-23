import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Conversation,
  ConversationMode,
  Memory,
  Role,
  StoredMessage,
  UserSettings,
} from "./types.js";

/**
 * Accès aux données. Deux implémentations :
 * - SupabaseStore : production (PostgreSQL géré par Supabase)
 * - MemoryStore   : tests et développement local, rien n'est persisté
 */
export interface Store {
  createConversation(userId: string, mode: ConversationMode): Promise<Conversation>;
  getConversation(userId: string, id: string): Promise<Conversation | null>;
  listConversations(userId: string, limit: number): Promise<Conversation[]>;
  updateConversation(
    userId: string,
    id: string,
    patch: Partial<Pick<Conversation, "title" | "summary">>,
  ): Promise<void>;
  deleteConversation(userId: string, id: string): Promise<boolean>;

  addMessage(input: {
    userId: string;
    conversationId: string;
    role: Role;
    content: string;
    imageCount?: number;
    interrupted?: boolean;
  }): Promise<StoredMessage>;
  listMessages(userId: string, conversationId: string, limit?: number): Promise<StoredMessage[]>;

  /** Compte les messages utilisateur et les images envoyées depuis `since`. */
  usageSince(userId: string, since: Date): Promise<{ messages: number; images: number }>;

  getSettings(userId: string): Promise<UserSettings>;
  updateSettings(userId: string, patch: Partial<UserSettings>): Promise<UserSettings>;

  listMemories(userId: string): Promise<Memory[]>;
  addMemories(userId: string, contents: string[]): Promise<void>;
  deleteMemory(userId: string, id: string): Promise<boolean>;
  deleteAllMemories(userId: string): Promise<void>;

  /** RGPD : suppression de toutes les données de l'utilisateur. */
  deleteAllUserData(userId: string): Promise<void>;
}

export const DEFAULT_SETTINGS: UserSettings = { memoryEnabled: false, language: "fr-FR" };

/* ------------------------------------------------------------------ */
/* MemoryStore                                                         */
/* ------------------------------------------------------------------ */

export class MemoryStore implements Store {
  private conversations = new Map<string, Conversation>();
  private messages: StoredMessage[] = [];
  private settings = new Map<string, UserSettings>();
  private memories: Memory[] = [];
  private clock = 0;

  private now(): string {
    // Horodatage strictement croissant pour un tri déterministe dans les tests
    this.clock = Math.max(this.clock + 1, Date.now());
    return new Date(this.clock).toISOString();
  }

  async createConversation(userId: string, mode: ConversationMode) {
    const now = this.now();
    const c: Conversation = {
      id: randomUUID(),
      userId,
      title: null,
      summary: null,
      mode,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(c.id, c);
    return { ...c };
  }

  async getConversation(userId: string, id: string) {
    const c = this.conversations.get(id);
    return c && c.userId === userId ? { ...c } : null;
  }

  async listConversations(userId: string, limit: number) {
    return [...this.conversations.values()]
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit)
      .map((c) => ({ ...c }));
  }

  async updateConversation(
    userId: string,
    id: string,
    patch: Partial<Pick<Conversation, "title" | "summary">>,
  ) {
    const c = this.conversations.get(id);
    if (c && c.userId === userId) Object.assign(c, patch);
  }

  async deleteConversation(userId: string, id: string) {
    const c = this.conversations.get(id);
    if (!c || c.userId !== userId) return false;
    this.conversations.delete(id);
    this.messages = this.messages.filter((m) => m.conversationId !== id);
    return true;
  }

  async addMessage(input: {
    userId: string;
    conversationId: string;
    role: Role;
    content: string;
    imageCount?: number;
    interrupted?: boolean;
  }) {
    const m: StoredMessage = {
      id: randomUUID(),
      conversationId: input.conversationId,
      userId: input.userId,
      role: input.role,
      content: input.content,
      imageCount: input.imageCount ?? 0,
      interrupted: input.interrupted ?? false,
      createdAt: this.now(),
    };
    this.messages.push(m);
    const c = this.conversations.get(input.conversationId);
    if (c) c.updatedAt = m.createdAt;
    return { ...m };
  }

  async listMessages(userId: string, conversationId: string, limit = 200) {
    return this.messages
      .filter((m) => m.userId === userId && m.conversationId === conversationId)
      .slice(-limit)
      .map((m) => ({ ...m }));
  }

  async usageSince(userId: string, since: Date) {
    const iso = since.toISOString();
    const mine = this.messages.filter(
      (m) => m.userId === userId && m.role === "user" && m.createdAt >= iso,
    );
    return { messages: mine.length, images: mine.reduce((n, m) => n + m.imageCount, 0) };
  }

  async getSettings(userId: string) {
    return { ...(this.settings.get(userId) ?? DEFAULT_SETTINGS) };
  }

  async updateSettings(userId: string, patch: Partial<UserSettings>) {
    const next = { ...(await this.getSettings(userId)), ...patch };
    this.settings.set(userId, next);
    return { ...next };
  }

  async listMemories(userId: string) {
    return this.memories.filter((m) => m.userId === userId).map((m) => ({ ...m }));
  }

  async addMemories(userId: string, contents: string[]) {
    for (const content of contents) {
      this.memories.push({ id: randomUUID(), userId, content, createdAt: this.now() });
    }
  }

  async deleteMemory(userId: string, id: string) {
    const before = this.memories.length;
    this.memories = this.memories.filter((m) => !(m.userId === userId && m.id === id));
    return this.memories.length < before;
  }

  async deleteAllMemories(userId: string) {
    this.memories = this.memories.filter((m) => m.userId !== userId);
  }

  async deleteAllUserData(userId: string) {
    for (const [id, c] of this.conversations) if (c.userId === userId) this.conversations.delete(id);
    this.messages = this.messages.filter((m) => m.userId !== userId);
    this.memories = this.memories.filter((m) => m.userId !== userId);
    this.settings.delete(userId);
  }
}

/* ------------------------------------------------------------------ */
/* SupabaseStore                                                       */
/* ------------------------------------------------------------------ */

type ConversationRow = {
  id: string;
  user_id: string;
  title: string | null;
  summary: string | null;
  mode: ConversationMode;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: Role;
  content: string;
  image_count: number;
  interrupted: boolean;
  created_at: string;
};

const toConversation = (r: ConversationRow): Conversation => ({
  id: r.id,
  userId: r.user_id,
  title: r.title,
  summary: r.summary,
  mode: r.mode,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toMessage = (r: MessageRow): StoredMessage => ({
  id: r.id,
  conversationId: r.conversation_id,
  userId: r.user_id,
  role: r.role,
  content: r.content,
  imageCount: r.image_count,
  interrupted: r.interrupted,
  createdAt: r.created_at,
});

/** Lève une erreur si Supabase renvoie une erreur ; le résultat peut être null. */
function checkMaybe<T>(res: { data: T | null; error: { message: string } | null }): T | null {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data;
}

/** Comme checkMaybe, mais un résultat vide est une erreur. */
function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  const data = checkMaybe(res);
  if (data === null) throw new Error("Supabase: réponse vide");
  return data;
}

export class SupabaseStore implements Store {
  readonly client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async createConversation(userId: string, mode: ConversationMode) {
    const row = check(
      await this.client
        .from("conversations")
        .insert({ user_id: userId, mode })
        .select()
        .single<ConversationRow>(),
    );
    return toConversation(row);
  }

  async getConversation(userId: string, id: string) {
    const row = checkMaybe(
      await this.client
        .from("conversations")
        .select()
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle<ConversationRow>(),
    );
    return row ? toConversation(row) : null;
  }

  async listConversations(userId: string, limit: number) {
    const rows = check(
      await this.client
        .from("conversations")
        .select()
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(limit)
        .returns<ConversationRow[]>(),
    );
    return rows.map(toConversation);
  }

  async updateConversation(
    userId: string,
    id: string,
    patch: Partial<Pick<Conversation, "title" | "summary">>,
  ) {
    checkMaybe(await this.client.from("conversations").update(patch).eq("id", id).eq("user_id", userId));
  }

  async deleteConversation(userId: string, id: string) {
    const rows = check(
      await this.client
        .from("conversations")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)
        .select("id")
        .returns<{ id: string }[]>(),
    );
    return rows.length > 0;
  }

  async addMessage(input: {
    userId: string;
    conversationId: string;
    role: Role;
    content: string;
    imageCount?: number;
    interrupted?: boolean;
  }) {
    const row = check(
      await this.client
        .from("messages")
        .insert({
          user_id: input.userId,
          conversation_id: input.conversationId,
          role: input.role,
          content: input.content,
          image_count: input.imageCount ?? 0,
          interrupted: input.interrupted ?? false,
        })
        .select()
        .single<MessageRow>(),
    );
    // updated_at de la conversation est mis à jour par un trigger SQL
    return toMessage(row);
  }

  async listMessages(userId: string, conversationId: string, limit = 200) {
    const rows = check(
      await this.client
        .from("messages")
        .select()
        .eq("conversation_id", conversationId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit)
        .returns<MessageRow[]>(),
    );
    return rows.reverse().map(toMessage);
  }

  async usageSince(userId: string, since: Date) {
    const rows = check(
      await this.client
        .from("messages")
        .select("image_count")
        .eq("user_id", userId)
        .eq("role", "user")
        .gte("created_at", since.toISOString())
        .returns<{ image_count: number }[]>(),
    );
    return { messages: rows.length, images: rows.reduce((n, r) => n + r.image_count, 0) };
  }

  async getSettings(userId: string) {
    const row = checkMaybe(
      await this.client
        .from("profiles")
        .select("memory_enabled, language")
        .eq("id", userId)
        .maybeSingle<{ memory_enabled: boolean; language: string }>(),
    );
    if (!row) return { ...DEFAULT_SETTINGS };
    return { memoryEnabled: row.memory_enabled, language: row.language };
  }

  async updateSettings(userId: string, patch: Partial<UserSettings>) {
    const next = { ...(await this.getSettings(userId)), ...patch };
    checkMaybe(
      await this.client
        .from("profiles")
        .upsert({ id: userId, memory_enabled: next.memoryEnabled, language: next.language }),
    );
    return next;
  }

  async listMemories(userId: string) {
    const rows = check(
      await this.client
        .from("memories")
        .select()
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .returns<{ id: string; user_id: string; content: string; created_at: string }[]>(),
    );
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      content: r.content,
      createdAt: r.created_at,
    }));
  }

  async addMemories(userId: string, contents: string[]) {
    if (contents.length === 0) return;
    checkMaybe(
      await this.client
        .from("memories")
        .insert(contents.map((content) => ({ user_id: userId, content }))),
    );
  }

  async deleteMemory(userId: string, id: string) {
    const rows = check(
      await this.client
        .from("memories")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)
        .select("id")
        .returns<{ id: string }[]>(),
    );
    return rows.length > 0;
  }

  async deleteAllMemories(userId: string) {
    checkMaybe(await this.client.from("memories").delete().eq("user_id", userId));
  }

  async deleteAllUserData(userId: string) {
    // Les messages sont supprimés en cascade avec les conversations
    checkMaybe(await this.client.from("conversations").delete().eq("user_id", userId));
    checkMaybe(await this.client.from("memories").delete().eq("user_id", userId));
    checkMaybe(await this.client.from("profiles").delete().eq("id", userId));
  }
}
