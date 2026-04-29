export const chapterSummaryPrompt = `
Summarize chapter for continuity memory. Focus on what the NEXT chapter's author needs to know to maintain perfect continuity.

CRITICAL REQUIREMENTS:
- chapterSummary: Write a dense narrative summary (3-5 sentences) covering: what happened, where it ended, what emotional state each character is in, and what is left unresolved. Include the LAST scene's setting and who is present.
- importantEvents: Key plot events in chronological order. Be specific (names, locations, actions).
- characterUpdates: For EACH character who appeared, track:
  - What new information they learned or revealed
  - Their emotional state at the END of the chapter (not the beginning)
  - How their relationships shifted
  - What they know and DON'T know (information boundaries are critical)
- plotThreads: List OPEN threads that need continuation. Mark which are newly opened vs carried from before.
- continuityWarnings: Flag anything the next chapter must NOT contradict (e.g. "Adriana does NOT know about the rocket plan", "Ravhi has NOT yet met Maya").

Output strict JSON only with this shape:
{
  "chapterSummary": string,
  "importantEvents": string[],
  "characterUpdates": [
    {
      "name": string,
      "newFacts": string[],
      "emotionalState": string,
      "relationshipChanges": object,
      "arcUpdate": string,
      "doesNotKnow": string[]
    }
  ],
  "worldUpdates": string[],
  "plotThreads": string[],
  "continuityWarnings": string[]
}
No markdown, no explanation, JSON only.
`.trim();
