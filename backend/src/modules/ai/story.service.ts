import { and, asc, desc, eq, lt } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { chapters, characters, memories, parts, projects, storyBibles } from '../../db/schema.js';
import { chapterGenerationPrompt } from '../../prompts/chapterGenerationPrompt.js';
import { chapterSummaryPrompt } from '../../prompts/chapterSummaryPrompt.js';
import { characterExtractionPrompt } from '../../prompts/characterExtractionPrompt.js';
import { memoryExtractionPrompt } from '../../prompts/memoryExtractionPrompt.js';
import { outlinePlannerPrompt } from '../../prompts/outlinePlannerPrompt.js';
import { systemNovelWriterPrompt } from '../../prompts/systemNovelWriterPrompt.js';
import { stringifyForContext } from '../../utils/text.js';
import { generateJson, generateText } from './client.js';
import { getOrCreateAiRuntimeSettings } from '../settings/service.js';
import {
  chapterSummarySchema,
  characterExtractionSchema,
  memoryExtractionSchema,
  outlineSchema,
  type ChapterSummaryResponse,
  type MemoryExtractionResponse,
  type OutlineResponse,
} from './types.js';

type ContextBucket = {
  label: string;
  mandatory: boolean;
  weight: number;
  text: string;
};

function withContextBudget(buckets: ContextBucket[], maxChars: number): string {
  const mandatory = buckets.filter((bucket) => bucket.mandatory);
  const optional = buckets
    .filter((bucket) => !bucket.mandatory)
    .sort((a, b) => b.weight - a.weight);

  const selected: ContextBucket[] = [];
  let used = 0;

  for (const entry of mandatory) {
    selected.push(entry);
    used += entry.text.length + 32;
  }

  for (const entry of optional) {
    if (used + entry.text.length + 32 > maxChars) continue;
    selected.push(entry);
    used += entry.text.length + 32;
  }

  return selected.map((item) => `[${item.label}]\n${item.text}`).join('\n\n');
}

export async function generateOutline(
  projectId: string,
  targetChapterCount?: number,
): Promise<OutlineResponse> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new Error('Project not found for outline generation.');

  const prompt = [
    'Build complete story outline from this project config.',
    `Master prompt: ${project.masterPrompt}`,
    `Output language: ${project.outputLanguage}`,
    `Tone: ${project.tone}`,
    `Genre: ${project.genre}`,
    `Pacing: ${project.pacing}`,
    targetChapterCount ? `Target chapter count: ${targetChapterCount}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const raw = await generateJson<unknown>({
    system: outlinePlannerPrompt,
    prompt,
    temperature: project.temperature,
  });

  return outlineSchema.parse(raw);
}

export async function generateChapter(
  projectId: string,
  chapterId: string,
): Promise<{ text: string; context: string }> {
  const settings = await getOrCreateAiRuntimeSettings();
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new Error('Project not found.');

  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId)).limit(1);
  if (!chapter) throw new Error('Chapter not found.');

  const [part] = chapter.partId
    ? await db.select().from(parts).where(eq(parts.id, chapter.partId)).limit(1)
    : [null];

  const [bible] = await db
    .select()
    .from(storyBibles)
    .where(eq(storyBibles.projectId, projectId))
    .orderBy(asc(storyBibles.createdAt))
    .limit(1);

  const prevSummaries = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      summary: chapters.summary,
      sortOrder: chapters.sortOrder,
    })
    .from(chapters)
    .where(and(eq(chapters.projectId, projectId), lt(chapters.sortOrder, chapter.sortOrder)))
    .orderBy(desc(chapters.sortOrder))
    .limit(16);

  const activeCharacters = await db
    .select()
    .from(characters)
    .where(eq(characters.projectId, projectId))
    .orderBy(asc(characters.name))
    .limit(20);

  const retrievedMemories = await db
    .select()
    .from(memories)
    .where(eq(memories.projectId, projectId))
    .orderBy(desc(memories.importance), desc(memories.createdAt))
    .limit(80);

  const memoryNeedles = [
    chapter.title,
    chapter.summary,
    part?.description ?? '',
    ...activeCharacters.slice(0, 5).map((character) => character.name),
  ]
    .join(' ')
    .toLowerCase();

  const relevantMemories = retrievedMemories
    .map((memory) => {
      const text = `${memory.title} ${memory.content}`.toLowerCase();
      const hit = memoryNeedles
        .split(/\s+/u)
        .filter((token) => token.length > 2)
        .some((token) => text.includes(token));
      return {
        ...memory,
        score: Number(memory.importance) + (hit ? 2 : 0),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  const buckets: ContextBucket[] = [
    {
      label: 'Master Prompt',
      mandatory: true,
      weight: 120,
      text: project.masterPrompt,
    },
    {
      label: 'System Writing Rules',
      mandatory: true,
      weight: 100,
      text: systemNovelWriterPrompt,
    },
    {
      label: 'Project Style Settings',
      mandatory: true,
      weight: 90,
      text: stringifyForContext({
        outputLanguage: project.outputLanguage,
        tone: project.tone,
        genre: project.genre,
        pacing: project.pacing,
        temperature: project.temperature,
      }),
    },
    {
      label: 'Story Bible',
      mandatory: true,
      weight: 100,
      text: stringifyForContext(bible?.contentJson ?? {}),
    },
    {
      label: 'Current Part',
      mandatory: true,
      weight: 85,
      text: stringifyForContext(part ?? {}),
    },
    {
      label: 'Current Chapter Instruction',
      mandatory: true,
      weight: 110,
      text: stringifyForContext(chapter),
    },
    {
      label: 'Character Profiles',
      mandatory: true,
      weight: 90,
      text: stringifyForContext(activeCharacters),
    },
    {
      label: 'Previous Chapter Summaries',
      mandatory: false,
      weight: 60,
      text: stringifyForContext(
        prevSummaries.map((item) => ({ title: item.title, summary: item.summary })),
      ),
    },
    {
      label: 'Relevant Memories',
      mandatory: false,
      weight: 75,
      text: stringifyForContext(
        relevantMemories.map((memory) => ({
          type: memory.type,
          title: memory.title,
          content: memory.content,
          importance: memory.importance,
        })),
      ),
    },
    {
      label: 'Continuity Constraints',
      mandatory: false,
      weight: 70,
      text: 'No continuity breaks. Preserve unresolved conflicts. Match chronology and character states.',
    },
  ];

  const context = withContextBudget(buckets, settings.contextMaxChars);
  const text = await generateText({
    system: systemNovelWriterPrompt,
    prompt: chapterGenerationPrompt(context),
    temperature: project.temperature,
    topP: settings.topP,
    maxTokens: settings.maxTokens,
  });

  return { text, context };
}

export async function summarizeChapterForMemory(
  chapterText: string,
): Promise<ChapterSummaryResponse> {
  const raw = await generateJson<unknown>({
    system: chapterSummaryPrompt,
    prompt: `Summarize this chapter:\n\n${chapterText}`,
  });
  return chapterSummarySchema.parse(raw);
}

export async function extractCharactersFromChapter(chapterText: string) {
  const raw = await generateJson<unknown>({
    system: characterExtractionPrompt,
    prompt: `Extract character updates from this chapter:\n\n${chapterText}`,
  });
  return characterExtractionSchema.parse(raw);
}

export async function extractMemoriesFromChapter(
  chapterText: string,
): Promise<MemoryExtractionResponse> {
  const raw = await generateJson<unknown>({
    system: memoryExtractionPrompt,
    prompt: `Extract memories from this chapter:\n\n${chapterText}`,
  });
  return memoryExtractionSchema.parse(raw);
}
