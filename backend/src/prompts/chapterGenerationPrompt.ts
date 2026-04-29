export function chapterGenerationPrompt(context: string): string {
  return `
Generate only one chapter as plain novel prose.

FORMAT RULES:
- No JSON output. No markdown. No bullet points. No emojis. No headings unless explicitly required.
- Output story text only. No explanation, no commentary, no meta notes.

CONTINUITY RULES (CRITICAL — HIGHEST PRIORITY):
- Read the Story Position, Previous Chapter Summaries, and Previous Chapter Ending sections carefully. They define exactly where the story is NOW.
- You MUST continue the story from where the previous chapter ended. NEVER restart from the beginning.
- NEVER re-write scenes that already happened in previous chapters (e.g. the opening cafe meeting, first encounter, etc.).
- If the previous chapter summaries show the story has progressed to team building, prototype, or later stages, you MUST write at that stage — not earlier.
- Assume all events described in previous summaries already happened. Do not repeat them.
- Characters who have already been introduced should not be re-introduced as if meeting for the first time.
- Emotional states and relationships should reflect their current status from summaries, not reset to initial states.
- Pay attention to CONTINUITY warnings in summaries. If a warning says "Character X does NOT know about Y", do NOT reveal Y to that character.
- If the Previous Chapter Ending is provided, your prose must flow seamlessly from it — same scene, same emotional temperature, same momentum. Do NOT start with a time jump or scene reset unless the chapter instructions explicitly call for one.

INFORMATION BOUNDARY RULES (CRITICAL):
- Each character only knows what has been explicitly revealed to them in the story so far.
- The Character Profiles section only includes characters who have already appeared. Do NOT introduce characters not listed there.
- Check the "doesNotKnow" and continuity warnings for each character. Never let a character demonstrate knowledge they should not have.

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
- For the FINAL chapters, follow the master prompt's ending sequence precisely.

Context:
${context}
`.trim();
}
