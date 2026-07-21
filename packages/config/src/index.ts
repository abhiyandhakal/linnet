import { z } from "zod";

const environment = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  WEB_ORIGIN: z.string().url(),
  AI_PROVIDER: z.enum(["groq", "deterministic"]).default("groq"),
  GROQ_API_KEY: z.string().optional(),
  GROQ_ROUTINE_MODEL: z.string().default("openai/gpt-oss-20b"),
  GROQ_REASONING_MODEL: z.string().default("openai/gpt-oss-120b"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALENDAR_REDIRECT_URL: z.string().url().optional(),
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

export type AppConfig = z.infer<typeof environment>;

export function getConfig(source: Record<string, string | undefined> = process.env): AppConfig {
  return environment.parse(source);
}
