import { and, eq } from 'drizzle-orm';
import type { Job } from 'bullmq';
import { db } from '../../db/index.js';
import { chapters, memories, parts, projects, storyBibles } from '../../db/schema.js';
import {
  extractCharactersFromChapter,
  extractMemoriesFromChapter,
  generateChapter,
  generateOutline,
  summarizeChapterForMemory,
} from '../../modules/ai/story.service.js';
import { upsertCharacterFromModel } from '../../modules/characters/service.js';
import { createMemory, resolveCharacterIdByName } from '../../modules/memories/service.js';
import {
  setJobCompleted,
  setJobFailed,
  setJobRunning,
  queueNextPendingChapter,
} from '../../modules/jobs/service.js';
import { publishProjectRefresh } from '../../modules/realtime/pubsub.js';
import { countChars, countWords } from '../../utils/text.js';
import type { QueueJobPayload } from '../queues.js';

async function applyOutline(payload: QueueJobPayload) {
  const rawCount = payload.input.targetChapterCount;
  const targetChapterCount = rawCount ? Number(rawCount) : undefined;
  console.log(`[worker] generating outline for project ${payload.projectId}...`);
  const outline = await generateOutline(
    payload.projectId,
    targetChapterCount && Number.isFinite(targetChapterCount) && targetChapterCount > 0
      ? targetChapterCount
      : undefined,
  );
  const totalChapters = outline.parts.reduce((sum, p) => sum + p.chapters.length, 0);
  console.log(`[worker] outline ready: "${outline.title}" — ${outline.parts.length} parts, ${totalChapters} chapters, ${outline.characters.length} characters`);

  await db
    .update(projects)
    .set({
      title: outline.title,
      status: 'ready',
    })
    .where(eq(projects.id, payload.projectId));

  const [existingBible] = await db
    .select()
    .from(storyBibles)
    .where(eq(storyBibles.projectId, payload.projectId))
    .limit(1);

  if (existingBible) {
    await db
      .update(storyBibles)
      .set({
        contentJson: outline.storyBible,
        summary: outline.storyBible.premise,
      })
      .where(eq(storyBibles.id, existingBible.id));
  } else {
    await db.insert(storyBibles).values({
      projectId: payload.projectId,
      contentJson: outline.storyBible,
      summary: outline.storyBible.premise,
    });
  }

  await db.delete(chapters).where(eq(chapters.projectId, payload.projectId));
  await db.delete(parts).where(eq(parts.projectId, payload.projectId));

  let chapterSort = 1;
  for (let i = 0; i < outline.parts.length; i += 1) {
    const part = outline.parts[i];
    const [partRow] = await db
      .insert(parts)
      .values({
        projectId: payload.projectId,
        title: part.title,
        description: part.description,
        sortOrder: i + 1,
      })
      .returning();

    for (const chapter of part.chapters) {
      await db.insert(chapters).values({
        projectId: payload.projectId,
        partId: partRow.id,
        title: chapter.title,
        summary: chapter.purpose,
        status: 'pending',
        sortOrder: chapterSort,
        arcsJson: chapter.arcs ?? [],
      });
      chapterSort += 1;
    }
  }

  for (const character of outline.characters) {
    await upsertCharacterFromModel({
      projectId: payload.projectId,
      name: character.name,
      role: character.role,
      description: character.description,
      traits: character.traits,
      goals: character.goals,
      relationships: character.relationships,
      emotionalState: character.emotionalState,
      currentArc: character.currentArc,
      knownFacts: character.knownFacts,
    });
  }

  await createMemory({
    projectId: payload.projectId,
    type: 'story_bible',
    title: 'Story Bible',
    content: outline.storyBible.premise,
    importance: 10,
    metadataJson: outline.storyBible as Record<string, unknown>,
  });

  console.log(`[worker] outline saved for project ${payload.projectId}`);
  return outline;
}

async function applyChapterGeneration(
  payload: QueueJobPayload,
  mode: 'generate' | 'continue' | 'regenerate',
) {
  if (!payload.chapterId) throw new Error('Missing chapterId.');

  const [chapter] = await db
    .select()
    .from(chapters)
    .where(eq(chapters.id, payload.chapterId))
    .limit(1);
  if (!chapter) throw new Error('Chapter not found.');

  // FIX 4: Clean up stale memories from previous generation before regenerating
  if (mode === 'regenerate') {
    await db
      .delete(memories)
      .where(and(eq(memories.chapterId, chapter.id), eq(memories.projectId, payload.projectId)));
    console.log(`[worker] cleaned up stale memories for chapter ${chapter.sortOrder} before regeneration`);
  }

  await db
    .update(chapters)
    .set({
      status: 'generating',
    })
    .where(eq(chapters.id, chapter.id));
  await publishProjectRefresh({
    projectId: payload.projectId,
    reason: 'chapter.generating',
    chapterId: chapter.id,
  });

  console.log(`[worker] ${mode} chapter ${chapter.sortOrder}: "${chapter.title}"...`);
  const result = await generateChapter(payload.projectId, chapter.id);
  const content =
    mode === 'continue' && chapter.content
      ? `${chapter.content.trim()}\n\n${result.text.trim()}`
      : result.text.trim();
  console.log(`[worker] chapter ${chapter.sortOrder} text generated (${countWords(content)} words), extracting metadata...`);

  const summary = await summarizeChapterForMemory(content);
  const characterExtraction = await extractCharactersFromChapter(content);
  const memoryExtraction = await extractMemoriesFromChapter(content);
  console.log(`[worker] chapter ${chapter.sortOrder} metadata extracted (${characterExtraction.characters.length} characters, ${memoryExtraction.memories.length} memories)`);

  // Build an enriched summary that includes plot threads and continuity warnings
  const enrichedSummary = [
    summary.chapterSummary,
    summary.plotThreads.length > 0 ? `Open threads: ${summary.plotThreads.join('; ')}` : '',
    summary.continuityWarnings.length > 0
      ? `CONTINUITY: ${summary.continuityWarnings.join('; ')}`
      : '',
  ]
    .filter(Boolean)
    .join(' | ');

  await db
    .update(chapters)
    .set({
      content,
      summary: enrichedSummary,
      wordCount: countWords(content),
      charCount: countChars(content),
      generationPromptSnapshot: result.context,
      status: 'completed',
    })
    .where(eq(chapters.id, chapter.id));
  await publishProjectRefresh({
    projectId: payload.projectId,
    reason: 'chapter.completed',
    chapterId: chapter.id,
  });

  for (const character of characterExtraction.characters) {
    await upsertCharacterFromModel({
      projectId: payload.projectId,
      chapterId: chapter.id,
      name: character.name,
      role: character.role,
      description: character.description,
      traits: character.traits,
      goals: character.goals,
      relationships: character.relationships,
      emotionalState: character.emotionalState,
      currentArc: character.currentArc,
      knownFacts: character.knownFacts,
    });
  }

  await createMemory({
    projectId: payload.projectId,
    chapterId: chapter.id,
    type: 'chapter_summary',
    title: chapter.title,
    content: summary.chapterSummary,
    importance: 9,
    metadataJson: {
      importantEvents: summary.importantEvents,
      plotThreads: summary.plotThreads,
    },
  });

  for (const item of memoryExtraction.memories) {
    const linkedCharacterId = item.relatedCharacterNames.length
      ? await resolveCharacterIdByName(payload.projectId, item.relatedCharacterNames[0]!)
      : null;
    await createMemory({
      projectId: payload.projectId,
      chapterId: chapter.id,
      characterId: linkedCharacterId,
      type: item.type,
      title: item.title,
      content: item.content,
      importance: item.importance,
      metadataJson: {
        ...item.metadata,
        relatedCharacterNames: item.relatedCharacterNames,
      },
    });
  }

  return {
    chapterId: chapter.id,
    summary,
  };
}

async function summarizeExistingChapter(payload: QueueJobPayload) {
  if (!payload.chapterId) throw new Error('Missing chapterId.');
  const [chapter] = await db
    .select()
    .from(chapters)
    .where(eq(chapters.id, payload.chapterId))
    .limit(1);
  if (!chapter) throw new Error('Chapter not found.');
  const summary = await summarizeChapterForMemory(chapter.content);
  await db
    .update(chapters)
    .set({
      summary: summary.chapterSummary,
    })
    .where(and(eq(chapters.id, chapter.id), eq(chapters.projectId, chapter.projectId)));
  return summary;
}

export async function processGenerationJob(job: Job<QueueJobPayload>) {
  const payload = job.data;
  console.log(`[worker] processing job ${payload.jobId} (${payload.type})`);
  await setJobRunning(payload.jobId, payload.projectId, payload.chapterId);

  try {
    let output: unknown = {};
    if (payload.type === 'generate_outline') {
      output = await applyOutline(payload);
    } else if (payload.type === 'generate_chapter') {
      output = await applyChapterGeneration(payload, 'generate');
    } else if (payload.type === 'continue_chapter') {
      output = await applyChapterGeneration(payload, 'continue');
    } else if (payload.type === 'regenerate_chapter') {
      output = await applyChapterGeneration(payload, 'regenerate');
    } else if (payload.type === 'summarize_chapter') {
      output = await summarizeExistingChapter(payload);
    } else if (payload.type === 'extract_characters') {
      output = await applyChapterGeneration(payload, 'generate');
    } else if (payload.type === 'refresh_memory') {
      output = await applyChapterGeneration(payload, 'generate');
    } else {
      throw new Error(`Unsupported job type: ${payload.type}`);
    }

    await setJobCompleted(payload.jobId, payload.projectId, payload.chapterId, output);
    console.log(`[worker] job ${payload.jobId} (${payload.type}) completed`);

    if (
      payload.type === 'generate_outline' ||
      payload.type === 'generate_chapter' ||
      payload.type === 'regenerate_chapter' ||
      payload.type === 'continue_chapter'
    ) {
      await queueNextPendingChapter(payload.projectId);
    }

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown worker error';
    console.error(`[worker] job ${payload.jobId} (${payload.type}) failed: ${message}`);
    await setJobFailed(payload.jobId, payload.projectId, payload.chapterId, message);
    if (payload.chapterId) {
      await db
        .update(chapters)
        .set({
          status: 'failed',
        })
        .where(eq(chapters.id, payload.chapterId));
      await publishProjectRefresh({
        projectId: payload.projectId,
        reason: 'chapter.failed',
        chapterId: payload.chapterId,
      });
    }
    if (payload.type === 'generate_outline') {
      await db
        .update(projects)
        .set({
          status: 'failed',
        })
        .where(eq(projects.id, payload.projectId));
      await publishProjectRefresh({
        projectId: payload.projectId,
        reason: 'project.failed',
      });
    }

    if (
      payload.type === 'generate_chapter' ||
      payload.type === 'regenerate_chapter' ||
      payload.type === 'continue_chapter'
    ) {
      await queueNextPendingChapter(payload.projectId);
    }

    throw error;
  }
}
