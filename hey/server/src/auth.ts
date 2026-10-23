import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string | null;
}

/** Vérifie le jeton envoyé par l'application (en-tête Authorization: Bearer ...). */
export interface AuthVerifier {
  verify(token: string): Promise<AuthUser | null>;
  /** Supprime le compte d'authentification (droit à l'effacement). */
  deleteUser(userId: string): Promise<void>;
}

export class SupabaseAuthVerifier implements AuthVerifier {
  constructor(private client: SupabaseClient) {}

  async verify(token: string) {
    const { data, error } = await this.client.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  }

  async deleteUser(userId: string) {
    const { error } = await this.client.auth.admin.deleteUser(userId);
    if (error) throw new Error(`Supabase auth: ${error.message}`);
  }
}

/**
 * Authentification de développement : le jeton "dev-<identifiant>" est accepté tel quel.
 * Uniquement pour tester sans Supabase. Refusé en production (voir config.ts).
 */
export class DevAuthVerifier implements AuthVerifier {
  async verify(token: string) {
    const m = /^dev-([a-zA-Z0-9_-]{1,64})$/.exec(token);
    return m ? { id: `00000000-0000-4000-8000-${hex12(m[1]!)}`, email: null } : null;
  }

  async deleteUser() {}
}

function hex12(s: string): string {
  let h = 0n;
  for (const ch of s) h = (h * 131n + BigInt(ch.codePointAt(0)!)) % 0xffffffffffffn;
  return h.toString(16).padStart(12, "0");
}

export function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1]!.trim() : null;
}
