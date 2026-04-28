import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
  chapterStatusEnum,
  chapters,
  parts,
  projects,
  storyBibles,
  type projectStatusEnum,
} from '../../db/schema.js';
import { AppError } from '../../utils/errors.js';

export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];
export type ChapterStatus = (typeof chapterStatusEnum.enumValues)[number];

export type CreateProjectInput = {
  userId: string;
  masterPrompt: string;
  outputLanguage: string;
  tone: string;
  genre: string;
  targetChapterCount: number;
  temperature: number;
  pacing: string;
};

export async function listProjectsForUser(userId: string) {
  return db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(asc(projects.createdAt));
}

export async function createProject(input: CreateProjectInput) {
  const [project] = await db
    .insert(projects)
    .values({
      userId: input.userId,
      title: 'Untitled Story',
      masterPrompt: input.masterPrompt,
      outputLanguage: input.outputLanguage,
      tone: input.tone,
      genre: input.genre,
      pacing: input.pacing,
      temperature: input.temperature,
      status: 'outlining',
    })
    .returning();

  await db.insert(storyBibles).values({
    projectId: project.id,
    contentJson: {
      pending: true,
      targetChapterCount: input.targetChapterCount,
    },
    summary: 'Outline generation queued.',
  });

  return project;
}

export async function getOwnedProject(projectId: string, userId: string) {
  const row = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  if (!row[0]) throw new AppError('Project not found', 404);
  return row[0];
}

export async function getProjectDetail(projectId: string, userId: string) {
  const project = await getOwnedProject(projectId, userId);
  const [bible] = await db
    .select()
    .from(storyBibles)
    .where(eq(storyBibles.projectId, projectId))
    .orderBy(asc(storyBibles.createdAt))
    .limit(1);
  return { ...project, storyBible: bible ?? null };
}

export async function updateProject(
  projectId: string,
  userId: string,
  patch: Partial<{
    title: string;
    tone: string;
    genre: string;
    outputLanguage: string;
    pacing: string;
    temperature: number;
    status: ProjectStatus;
  }>,
) {
  await getOwnedProject(projectId, userId);
  const [row] = await db
    .update(projects)
    .set(patch)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning();
  return row;
}

export async function deleteProject(projectId: string, userId: string) {
  await getOwnedProject(projectId, userId);
  await db.delete(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
}

export async function setProjectStatus(projectId: string, status: ProjectStatus) {
  await db.update(projects).set({ status }).where(eq(projects.id, projectId));
}

export async function getChapterIdsForProject(projectId: string) {
  const rows = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(eq(chapters.projectId, projectId))
    .orderBy(asc(chapters.sortOrder));
  return rows.map((row) => row.id);
}

export async function getNextPendingChapterId(projectId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(and(eq(chapters.projectId, projectId), eq(chapters.status, 'pending')))
    .orderBy(asc(chapters.sortOrder))
    .limit(1);
  return row?.id ?? null;
}

export async function hasActiveChapterJobs(projectId: string): Promise<boolean> {
  const rows = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(
      and(
        eq(chapters.projectId, projectId),
        inArray(chapters.status, ['queued', 'generating']),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function getFailedChapterIds(projectId: string): Promise<string[]> {
  const rows = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(and(eq(chapters.projectId, projectId), eq(chapters.status, 'failed')))
    .orderBy(asc(chapters.sortOrder));
  return rows.map((row) => row.id);
}

export async function setChaptersStatusByIds(chapterIds: string[], status: ChapterStatus) {
  if (chapterIds.length === 0) return;
  await db.update(chapters).set({ status }).where(inArray(chapters.id, chapterIds));
}

export async function listProjectParts(projectId: string) {
  return db
    .select()
    .from(parts)
    .where(eq(parts.projectId, projectId))
    .orderBy(asc(parts.sortOrder));
}
