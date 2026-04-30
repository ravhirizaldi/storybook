import OpenAI from 'openai';
import { parseJsonFromModel } from '../../utils/json.js';
import { getOrCreateAiRuntimeSettings } from '../settings/service.js';

type ChatInput = {
  system?: string;
  prompt: string;
  model?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
};

type ChatCreateArgs = {
  model: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  response_format?: { type: 'json_object' };
};

function makeClient(settings: { apiKey: string; baseUrl: string }) {
  return new OpenAI({
    apiKey: settings.apiKey,
    baseURL: settings.baseUrl,
    timeout: 120_000,
  });
}

function needsMaxCompletionTokens(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Unsupported parameter') &&
    message.includes('max_tokens') &&
    message.includes('max_completion_tokens')
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function createChatCompletionWithCompat(
  client: OpenAI,
  args: ChatCreateArgs,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const payload: Record<string, unknown> = { ...args };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await client.chat.completions.create(payload as any);
    } catch (error) {
      const message = errorMessage(error);

      if (needsMaxCompletionTokens(error) && 'max_tokens' in payload) {
        const maxTokens = payload.max_tokens;
        delete payload.max_tokens;
        payload.max_completion_tokens = maxTokens;
        continue;
      }

      if (
        (message.includes("Unsupported value: 'temperature'") ||
          message.includes("Unsupported parameter: 'temperature'")) &&
        'temperature' in payload
      ) {
        delete payload.temperature;
        continue;
      }

      if (
        (message.includes("Unsupported value: 'top_p'") ||
          message.includes("Unsupported parameter: 'top_p'")) &&
        'top_p' in payload
      ) {
        delete payload.top_p;
        continue;
      }

      if (
        (message.includes("Unsupported parameter: 'response_format'") ||
          message.includes('response_format')) &&
        'response_format' in payload
      ) {
        delete payload.response_format;
        continue;
      }

      throw error;
    }
  }

  throw new Error('Failed to create chat completion after compatibility retries.');
}

function getText(content: OpenAI.Chat.Completions.ChatCompletionMessage['content']): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  const parts = content as Array<{ type?: string; text?: string }>;
  return parts
    .map((part: any) => (part?.type === 'text' ? part.text : ''))
    .join('\n')
    .trim();
}

export async function generateText(input: ChatInput): Promise<string> {
  const settings = await getOrCreateAiRuntimeSettings();
  const client = makeClient(settings);

  const response = await createChatCompletionWithCompat(client, {
    model: input.model ?? settings.model,
    temperature: input.temperature ?? settings.temperature,
    top_p: input.topP ?? settings.topP,
    max_tokens: input.maxTokens ?? settings.maxTokens,
    messages: [
      ...(input.system ? [{ role: 'system' as const, content: input.system }] : []),
      { role: 'user' as const, content: input.prompt },
    ],
  });

  return getText(response.choices[0]?.message?.content);
}

export async function generateJson<T>(input: ChatInput): Promise<T> {
  const settings = await getOrCreateAiRuntimeSettings();
  const client = makeClient(settings);

  try {
    const response = await createChatCompletionWithCompat(client, {
      model: input.model ?? settings.model,
      temperature: input.temperature ?? settings.temperature,
      top_p: input.topP ?? settings.topP,
      max_tokens: input.maxTokens ?? settings.maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        ...(input.system ? [{ role: 'system' as const, content: input.system }] : []),
        { role: 'user' as const, content: input.prompt },
      ],
    });

    const text = getText(response.choices[0]?.message?.content);
    return parseJsonFromModel<T>(text);
  } catch {
    const fallback = await generateText(input);
    return parseJsonFromModel<T>(fallback);
  }
}

export async function embedTexts(values: string[]): Promise<number[][]> {
  if (values.length === 0) return [];
  const settings = await getOrCreateAiRuntimeSettings();

  const embeddingClient = makeClient({
    apiKey: settings.embeddingApiKey || settings.apiKey,
    baseUrl: settings.embeddingBaseUrl || settings.baseUrl,
  });

  const response = await embeddingClient.embeddings.create({
    model: settings.embeddingModel,
    input: values,
  });
  return response.data.map((item) => item.embedding);
}
