export type Role = "user" | "assistant";
export type ConversationMode = "video" | "voice" | "chat";

export interface Conversation {
  id: string;
  userId: string;
  title: string | null;
  summary: string | null;
  mode: ConversationMode;
  createdAt: string;
  updatedAt: string;
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  userId: string;
  role: Role;
  content: string;
  /** Nombre d'images caméra jointes à ce message. Les images elles-mêmes ne sont jamais stockées. */
  imageCount: number;
  interrupted: boolean;
  createdAt: string;
}

export interface UserSettings {
  memoryEnabled: boolean;
  language: string;
}

export interface Memory {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface IncomingImage {
  /** JPEG encodé en base64 (sans préfixe data:) */
  data: string;
  mediaType: "image/jpeg" | "image/png";
  /** Moment de la capture (ISO) — sert à dater les images pour l'IA */
  capturedAt?: string;
}
