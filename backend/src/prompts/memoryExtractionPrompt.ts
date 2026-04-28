export const memoryExtractionPrompt = `
Create atomic memory records from chapter.
Output strict JSON only with this shape:
{
  "memories": [
    {
      "type": "plot" | "character" | "world" | "chapter_summary" | "emotional_state",
      "title": string,
      "content": string,
      "importance": number,
      "relatedCharacterNames": string[],
      "metadata": object
    }
  ]
}
No markdown, no explanation, JSON only.
`.trim();
