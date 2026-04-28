import { eq } from 'drizzle-orm';
import { env } from '../../config/env.js';
import { db } from '../../db/index.js';
import { aiRuntimeSettings } from '../../db/schema.js';

const SETTINGS_NAME = 'default';

export type AiRuntimeSettings = {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  embeddingModel: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  contextMaxChars: number;
  createdAt: Date;
  updatedAt: Date;
};

function defaultsFromEnv() {
  return {
    name: SETTINGS_NAME,
    apiKey: env.AI_API_KEY,
    baseUrl: env.AI_BASE_URL,
    model: env.AI_MODEL,
    embeddingModel: env.AI_EMBEDDING_MODEL,
    temperature: env.AI_TEMPERATURE,
    topP: env.AI_TOP_P,
    maxTokens: env.AI_MAX_TOKENS,
    contextMaxChars: env.AI_CONTEXT_MAX_CHARS,
  };
}

export async function getOrCreateAiRuntimeSettings(): Promise<AiRuntimeSettings> {
  const row = await db
    .select()
    .from(aiRuntimeSettings)
    .where(eq(aiRuntimeSettings.name, SETTINGS_NAME))
    .limit(1);

  if (row[0]) return row[0];

  const [created] = await db.insert(aiRuntimeSettings).values(defaultsFromEnv()).returning();
  return created;
}

export async function updateAiRuntimeSettings(
  patch: Partial<{
    apiKey: string;
    baseUrl: string;
    model: string;
    embeddingModel: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    contextMaxChars: number;
  }>,
): Promise<AiRuntimeSettings> {
  const current = await getOrCreateAiRuntimeSettings();
  const [updated] = await db
    .update(aiRuntimeSettings)
    .set(patch)
    .where(eq(aiRuntimeSettings.id, current.id))
    .returning();
  return updated;
}
