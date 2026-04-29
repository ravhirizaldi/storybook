import { z } from 'zod';

export const outlineSchema = z.object({
  title: z.string(),
  storyBible: z.object({
    premise: z.string(),
    genre: z.string(),
    tone: z.string(),
    languageStyle: z.string(),
    coreRules: z.array(z.string()),
    worldRules: z.array(z.string()),
    timeline: z.array(z.string()),
    endingDirection: z.string(),
  }),
  parts: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      chapters: z.array(
        z.object({
          title: z.string(),
          purpose: z.string(),
          expectedTone: z.string(),
          keyEvents: z.array(z.string()),
          arcs: z.array(
            z.object({
              title: z.string(),
              description: z.string(),
            }),
          ),
        }),
      ),
    }),
  ),
  characters: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      description: z.string(),
      traits: z.array(z.string()),
      goals: z.array(z.string()),
      relationships: z.record(z.any()),
      emotionalState: z.string(),
      currentArc: z.string(),
      knownFacts: z.array(z.string()),
    }),
  ),
});

export type OutlineResponse = z.infer<typeof outlineSchema>;

export const chapterSummarySchema = z.object({
  chapterSummary: z.string(),
  importantEvents: z.array(z.string()),
  characterUpdates: z.array(
    z.object({
      name: z.string(),
      newFacts: z.array(z.string()),
      emotionalState: z.string(),
      relationshipChanges: z.record(z.any()),
      arcUpdate: z.string(),
      doesNotKnow: z.array(z.string()).optional().default([]),
    }),
  ),
  worldUpdates: z.array(z.string()),
  plotThreads: z.array(z.string()),
  continuityWarnings: z.array(z.string()),
});

export type ChapterSummaryResponse = z.infer<typeof chapterSummarySchema>;

export const characterExtractionSchema = z.object({
  characters: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      description: z.string(),
      traits: z.array(z.string()),
      goals: z.array(z.string()),
      relationships: z.record(z.any()),
      emotionalState: z.string(),
      currentArc: z.string(),
      knownFacts: z.array(z.string()),
    }),
  ),
});

export const memoryExtractionSchema = z.object({
  memories: z.array(
    z.object({
      type: z.enum(['plot', 'character', 'world', 'chapter_summary', 'emotional_state']),
      title: z.string(),
      content: z.string(),
      importance: z.number().int().min(1).max(10),
      relatedCharacterNames: z.array(z.string()),
      metadata: z.record(z.any()),
    }),
  ),
});

export type MemoryExtractionResponse = z.infer<typeof memoryExtractionSchema>;
