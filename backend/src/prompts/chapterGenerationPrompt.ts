export function chapterGenerationPrompt(context: string): string {
  return `
Generate only one chapter as plain novel prose.
Rules:
- No JSON output.
- No markdown output.
- No bullet points.
- No emojis.
- No headings unless explicitly required by chapter instruction.
- Preserve continuity with provided story bible, character profiles, summaries, and memories.
- Do not resolve major conflicts too early.
- Keep language natural, character-driven, and scene-focused.

Context:
${context}
`.trim();
}
