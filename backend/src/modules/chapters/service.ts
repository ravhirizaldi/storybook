import { and, asc, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { chapters, parts, projects } from '../../db/schema.js';
import { AppError } from '../../utils/errors.js';

async function getChapterWithProject(chapterId: string) {
  const row = await db
    .select({
      chapter: chapters,
      project: projects,
    })
    .from(chapters)
    .innerJoin(projects, eq(chapters.projectId, projects.id))
    .where(eq(chapters.id, chapterId))
    .limit(1);
  return row[0] ?? null;
}

export async function assertChapterOwnership(chapterId: string, userId: string) {
  const row = await getChapterWithProject(chapterId);
  if (!row || row.project.userId !== userId) throw new AppError('Chapter not found', 404);
  return row.chapter;
}

export async function listProjectChapters(projectId: string) {
  return db
    .select({
      id: chapters.id,
      projectId: chapters.projectId,
      partId: chapters.partId,
      title: chapters.title,
      summary: chapters.summary,
      content: chapters.content,
      status: chapters.status,
      sortOrder: chapters.sortOrder,
      wordCount: chapters.wordCount,
      charCount: chapters.charCount,
      arcsJson: chapters.arcsJson,
      generationPromptSnapshot: chapters.generationPromptSnapshot,
      partTitle: parts.title,
      createdAt: chapters.createdAt,
      updatedAt: chapters.updatedAt,
    })
    .from(chapters)
    .leftJoin(parts, eq(chapters.partId, parts.id))
    .where(eq(chapters.projectId, projectId))
    .orderBy(asc(chapters.sortOrder));
}

export async function getChapter(chapterId: string, userId: string) {
  const chapter = await assertChapterOwnership(chapterId, userId);
  return chapter;
}

export async function updateChapter(
  chapterId: string,
  userId: string,
  patch: Partial<{
    title: string;
    content: string;
    summary: string;
    status: 'pending' | 'queued' | 'generating' | 'completed' | 'failed';
  }>,
) {
  const chapter = await assertChapterOwnership(chapterId, userId);
  const [row] = await db
    .update(chapters)
    .set(patch)
    .where(and(eq(chapters.id, chapter.id), eq(chapters.projectId, chapter.projectId)))
    .returning();
  return row;
}
