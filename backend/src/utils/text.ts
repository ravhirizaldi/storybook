export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}

export function countChars(text: string): number {
  return text.length;
}

export function clip(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 3)}...`;
}

export function stringifyForContext(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}
