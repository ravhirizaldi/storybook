import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(8),
  AI_API_KEY: z.string().default(''),
  AI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  AI_MODEL: z.string().default('gpt-4.1-mini'),
  AI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  AI_EMBEDDING_API_KEY: z.string().default(''),
  AI_EMBEDDING_BASE_URL: z.string().default(''),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.85),
  AI_TOP_P: z.coerce.number().min(0).max(1).default(0.95),
  AI_MAX_TOKENS: z.coerce.number().min(128).default(16000),
  AI_CONTEXT_MAX_CHARS: z.coerce.number().min(2000).default(24000),
  EMBEDDING_DIMENSION: z.coerce.number().min(64).default(1536),
});

export const env = EnvSchema.parse(process.env);
