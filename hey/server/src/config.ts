import { z } from "zod";

const bool = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1");

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
  HOST: z.string().default("0.0.0.0"),
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().default("claude-opus-5-5"),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  DAILY_MESSAGE_LIMIT: z.coerce.number().int().positive().default(200),
  DAILY_IMAGE_LIMIT: z.coerce.number().int().positive().default(400),
  MAX_IMAGES_PER_TURN: z.coerce.number().int().positive().default(2),
  // ~1.5 Mo par image en base64 (les images sont réduites à ~768 px côté mobile)
  MAX_IMAGE_BASE64_CHARS: z.coerce.number().int().positive().default(2_000_000),
  MAX_TEXT_CHARS: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().default(""),
  ALLOW_DEV_AUTH: bool,
});

export type Config = z.infer<typeof EnvSchema> & { isProduction: boolean };

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.parse(env);
  const isProduction = parsed.NODE_ENV === "production";
  if (isProduction && parsed.ALLOW_DEV_AUTH) {
    throw new Error("ALLOW_DEV_AUTH est interdit en production.");
  }
  return { ...parsed, isProduction };
}
