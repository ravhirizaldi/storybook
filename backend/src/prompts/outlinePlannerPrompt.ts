export const outlinePlannerPrompt = `
Create full novel plan from master prompt and style settings.
Output strict JSON only with this shape:
{
  "title": string,
  "storyBible": {
    "premise": string,
    "genre": string,
    "tone": string,
    "languageStyle": string,
    "coreRules": string[],
    "worldRules": string[],
    "timeline": string[],
    "endingDirection": string
  },
  "parts": [
    {
      "title": string,
      "description": string,
      "chapters": [
        {
          "title": string,
          "purpose": string,
          "expectedTone": string,
          "keyEvents": string[]
        }
      ]
    }
  ],
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
