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

  // Fetch previous chapters (newest first for slicing, then reverse to chronological)
  const allPrevChapters = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      summary: chapters.summary,
      content: chapters.content,
      sortOrder: chapters.sortOrder,
    })
    .from(chapters)
    .where(and(eq(chapters.projectId, projectId), lt(chapters.sortOrder, chapter.sortOrder)))
    .orderBy(desc(chapters.sortOrder))
    .limit(16);

  const totalChapterCount = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(eq(chapters.projectId, projectId));

  // FIX 1: Reverse to chronological order so AI reads them in story sequence
  const recentSummaries = allPrevChapters.slice(0, 5).reverse();
  const olderSummaries = allPrevChapters.slice(5).reverse();

  // FIX 3: Get the immediately previous chapter's ending for seamless continuity
  const immediatelyPrev = allPrevChapters[0] ?? null;
  const prevChapterEnding = immediatelyPrev?.content
    ? extractEnding(immediatelyPrev.content, 1500)
    : null;

  // FIX 6: Only include characters who have appeared by this chapter's position
  // Characters from the initial outline (no firstAppearedChapterId) are always included
  const prevChapterIds = allPrevChapters.map((c) => c.id);
  const allCharacters = await db
    .select()
    .from(characters)
    .where(eq(characters.projectId, projectId))
    .orderBy(asc(characters.name))
    .limit(30);

  const activeCharacters = allCharacters.filter((c) => {
    if (!c.firstAppearedChapterId) return true;
    return prevChapterIds.includes(c.firstAppearedChapterId);
  });

  // FIX 7: Improved memory retrieval with recency boost and chapter_summary priority
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
      const needleTokens = memoryNeedles
        .split(/\s+/u)
        .filter((token) => token.length > 2);
      const matchCount = needleTokens.filter((token) => text.includes(token)).length;

      let score = Number(memory.importance);
      // Keyword relevance boost (scaled by match count)
      if (matchCount > 0) score += Math.min(matchCount, 5);
      // Chapter summary memories are always high priority
      if (memory.type === 'chapter_summary') score += 3;
      // Recency boost: memories from recent chapters matter more
      if (memory.chapterId && prevChapterIds.slice(0, 5).includes(memory.chapterId)) score += 2;

      return { ...memory, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);

  // FIX 2: Only send relevant chapter fields, not content/prompt snapshot
  const chapterInstruction = {
    title: chapter.title,
    summary: chapter.summary,
    sortOrder: chapter.sortOrder,
    arcsJson: chapter.arcsJson,
  };

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
      text: stringifyForContext({
        title: part?.title ?? '',
        description: part?.description ?? '',
        sortOrder: part?.sortOrder ?? 0,
      }),
    },
    {
      label: 'Story Position',
      mandatory: true,
      weight: 115,
      text: `You are writing chapter ${chapter.sortOrder} of ${totalChapterCount.length} total chapters. ${
        chapter.sortOrder === totalChapterCount.length
          ? 'THIS IS THE FINAL CHAPTER. Follow the master prompt ending sequence precisely.'
          : chapter.sortOrder >= totalChapterCount.length - 1
            ? 'This is near the end of the story. Begin wrapping up toward the master prompt ending.'
            : ''
      } ${
        immediatelyPrev
          ? `The previous chapter was "${immediatelyPrev.title}" (chapter ${immediatelyPrev.sortOrder}). Continue from where it ended. Do NOT restart the story.`
          : 'This is the first chapter.'
      }`,
    },
    {
      label: 'Current Chapter Instruction',
      mandatory: true,
      weight: 110,
      text: stringifyForContext(chapterInstruction),
    },
    {
      label: 'Character Profiles (only characters who have appeared so far)',
      mandatory: true,
      weight: 90,
      text: stringifyForContext(
        activeCharacters.map((c) => ({
          name: c.name,
          role: c.role,
          description: c.description,
          traits: c.traitsJson,
          goals: c.goalsJson,
          relationships: c.relationshipsJson,
          emotionalState: c.emotionalState,
          currentArc: c.currentArc,
          knownFacts: c.knownFactsJson,
        })),
      ),
    },
    {
      label: 'Recent Chapter Summaries (MANDATORY — chronological order, DO NOT IGNORE)',
      mandatory: true,
      weight: 105,
      text:
        recentSummaries.length > 0
          ? stringifyForContext(
              recentSummaries.map((item) => ({
                chapter: item.sortOrder,
                title: item.title,
                summary: item.summary,
              })),
            )
          : 'No previous chapters yet. This is the beginning of the story.',
    },
  ];

  // FIX 3: Previous chapter ending for seamless prose continuity
  if (prevChapterEnding) {
    buckets.push({
      label: 'Previous Chapter Ending (continue seamlessly from this prose)',
      mandatory: true,
      weight: 108,
      text: prevChapterEnding,
    });
  }

  buckets.push(
    {
      label: 'Older Chapter Summaries (chronological)',
      mandatory: false,
      weight: 60,
      text: stringifyForContext(
        olderSummaries.map((item) => ({
          chapter: item.sortOrder,
          title: item.title,
          summary: item.summary,
        })),
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
  );

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

function extractEnding(content: string, maxChars: number): string {
  const paragraphs = content.split('\n').filter((p) => p.trim());
  if (paragraphs.length === 0) return '';
  const result: string[] = [];
  let used = 0;
  for (let i = paragraphs.length - 1; i >= 0; i--) {
    if (used + paragraphs[i].length > maxChars && result.length > 0) break;
    result.unshift(paragraphs[i]);
    used += paragraphs[i].length;
  }
  return result.join('\n\n');
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
