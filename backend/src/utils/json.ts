export function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function extractFirstJsonObject(raw: string): string | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return raw.slice(start, end + 1);
}

export function parseJsonFromModel<T>(raw: string): T {
  const direct = safeJsonParse<T>(raw);
  if (direct) return direct;

  const extracted = extractFirstJsonObject(raw);
  if (!extracted) {
    throw new Error('Model response did not include valid JSON.');
  }

  const parsed = safeJsonParse<T>(extracted);
  if (!parsed) {
    throw new Error('Unable to parse JSON from model response.');
  }

  return parsed;
}
