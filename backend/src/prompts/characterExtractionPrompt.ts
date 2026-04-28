export const characterExtractionPrompt = `
Extract and update character information after chapter.
Output strict JSON only with this shape:
{
  "characters": [
    {
      "name": string,
      "role": string,
      "description": string,
      "traits": string[],
      "goals": string[],
      "relationships": object,
      "emotionalState": string,
      "currentArc": string,
      "knownFacts": string[]
    }
  ]
}
No markdown, no explanation, JSON only.
`.trim();
