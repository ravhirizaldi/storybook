export const chapterSummaryPrompt = `
Summarize chapter for continuity memory.
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
      "arcUpdate": string
    }
  ],
  "worldUpdates": string[],
  "plotThreads": string[],
  "continuityWarnings": string[]
}
No markdown, no explanation, JSON only.
`.trim();
