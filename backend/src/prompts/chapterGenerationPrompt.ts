export function chapterGenerationPrompt(context: string): string {
  return `
Generate only one chapter as plain novel prose.

FORMAT RULES:
- No JSON output. No markdown. No bullet points. No emojis. No headings unless explicitly required.
- Output story text only. No explanation, no commentary, no meta notes.

WRITING RULES:
- Preserve continuity with provided story bible, character profiles, summaries, and memories.
- Do not resolve major conflicts too early. Maintain unresolved tension.
- Keep language natural, character-driven, and scene-focused.
- Every scene must add something new: reveal character information, move the plot forward, change emotional tension, create a new problem, deepen a relationship, show a consequence, or escalate stakes.

MASTER PROMPT ENFORCEMENT (CRITICAL):
- The Master Prompt section below contains the author's strict rules. These override all defaults.
- Follow all pacing rules, phase isolation rules, information boundary rules, and character introduction timing rules exactly.
- If the master prompt says a character must NOT appear yet, do not introduce them.
- If the master prompt says information must NOT be revealed, do not reveal it through dialogue, narration, or internal monologue.
- If the master prompt specifies how an idea forms (gradually, not instantly), follow that progression.
- Do not repeat the same scene structure or emotional beat from previous chapters.

Context:
${context}
`.trim();
}
