import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { chapters, generationJobs, projects } from '../../db/schema.js';
import type { JobType } from '../../workers/queues.js';
import { generationQueue } from '../../workers/queues.js';
import { publishProjectRefresh } from '../realtime/pubsub.js';
import { getNextPendingChapterId, hasActiveChapterJobs } from '../projects/service.js';

type CreateJobInput = {
  projectId: string;
  chapterId?: string | null;
  type: JobType;
  input?: Record<string, unknown>;
};

export async function createAndQueueJob(input: CreateJobInput) {
  const [row] = await db
    .insert(generationJobs)
    .values({
      projectId: input.projectId,
      chapterId: input.chapterId ?? null,
      type: input.type,
      status: 'queued',
      inputJson: input.input ?? {},
    })
    .returning();

  await generationQueue.add(input.type, {
    jobId: row.id,
    projectId: input.projectId,
    chapterId: input.chapterId ?? null,
    type: input.type,
    input: input.input ?? {},
  });

  if (input.chapterId) {
    await db.update(chapters).set({ status: 'queued' }).where(eq(chapters.id, input.chapterId));
  }

  await publishProjectRefresh({
    projectId: input.projectId,
    reason: `job.${input.type}.queued`,
    chapterId: input.chapterId ?? null,
  });

  return row;
}

export async function setJobRunning(jobId: string, projectId: string, chapterId?: string | null) {
  await db.update(generationJobs).set({ status: 'running' }).where(eq(generationJobs.id, jobId));
  await publishProjectRefresh({
    projectId,
    reason: 'job.running',
    chapterId: chapterId ?? null,
  });
}

export async function setJobCompleted(
  jobId: string,
  projectId: string,
  chapterId: string | null | undefined,
  outputJson: unknown = {},
) {
  await db
    .update(generationJobs)
    .set({
      status: 'completed',
      outputJson: outputJson as Record<string, unknown>,
      error: '',
    })
    .where(eq(generationJobs.id, jobId));
  await publishProjectRefresh({
    projectId,
    reason: 'job.completed',
    chapterId: chapterId ?? null,
  });
}

export async function setJobFailed(
  jobId: string,
  projectId: string,
  chapterId: string | null | undefined,
  error: string,
) {
  await db
    .update(generationJobs)
    .set({
      status: 'failed',
      error,
    })
    .where(eq(generationJobs.id, jobId));
  await publishProjectRefresh({
    projectId,
    reason: 'job.failed',
    chapterId: chapterId ?? null,
  });
}

export async function listProjectJobs(projectId: string) {
  return db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.projectId, projectId))
    .orderBy(desc(generationJobs.createdAt));
}

export async function getProjectJob(projectId: string, jobId: string) {
  const row = await db
    .select()
    .from(generationJobs)
    .where(and(eq(generationJobs.projectId, projectId), eq(generationJobs.id, jobId)))
    .limit(1);
  return row[0] ?? null;
}

export async function getJobById(jobId: string) {
  const row = await db.select().from(generationJobs).where(eq(generationJobs.id, jobId)).limit(1);
  return row[0] ?? null;
}

export async function queueNextPendingChapter(projectId: string): Promise<boolean> {
  const active = await hasActiveChapterJobs(projectId);
  if (active) return false;

  const nextId = await getNextPendingChapterId(projectId);
  if (!nextId) {
    await db
      .update(projects)
      .set({ status: 'ready' })
      .where(eq(projects.id, projectId));
    await publishProjectRefresh({ projectId, reason: 'project.allChaptersDone' });
    return false;
  }

  await db
    .update(projects)
    .set({ status: 'generating' })
    .where(eq(projects.id, projectId));

  await createAndQueueJob({
    projectId,
    chapterId: nextId,
    type: 'generate_chapter',
    input: {},
  });
  return true;
}
