import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';
import { createAndQueueJob } from '../jobs/service.js';
import { getOwnedProject } from '../projects/service.js';
import { publishProjectRefresh } from '../realtime/pubsub.js';
import {
  assertChapterOwnership,
  getChapter,
  listProjectChapters,
  updateChapter,
} from './service.js';

const chapterIdSchema = z.object({ chapterId: z.string().uuid() });
const projectIdSchema = z.object({ projectId: z.string().uuid() });

const updateChapterSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().optional(),
  status: z.enum(['pending', 'queued', 'generating', 'completed', 'failed']).optional(),
});

export const chaptersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/projects/:projectId/chapters',
    { preHandler: [fastify.verifyAuth] },
    async (request, reply) => {
      const { projectId } = projectIdSchema.parse(request.params);
      await getOwnedProject(projectId, request.userAuth!.userId);
      const rows = await listProjectChapters(projectId);
      return reply.send(rows);
    },
  );

  fastify.get('/chapters/:chapterId', { preHandler: [fastify.verifyAuth] }, async (request) => {
    const { chapterId } = chapterIdSchema.parse(request.params);
    return getChapter(chapterId, request.userAuth!.userId);
  });

  fastify.patch('/chapters/:chapterId', { preHandler: [fastify.verifyAuth] }, async (request) => {
    const { chapterId } = chapterIdSchema.parse(request.params);
    const body = updateChapterSchema.parse(request.body);
    const chapter = await updateChapter(chapterId, request.userAuth!.userId, body);
    await publishProjectRefresh({
      projectId: chapter.projectId,
      chapterId: chapter.id,
      reason: 'chapter.updated',
    });
    return chapter;
  });

  fastify.post(
    '/chapters/:chapterId/generate',
    { preHandler: [fastify.verifyAuth] },
    async (request) => {
      const { chapterId } = chapterIdSchema.parse(request.params);
      const chapter = await assertChapterOwnership(chapterId, request.userAuth!.userId);
      const job = await createAndQueueJob({
        projectId: chapter.projectId,
        chapterId: chapter.id,
        type: 'generate_chapter',
        input: {},
      });
      return { jobId: job.id };
    },
  );

  fastify.post(
    '/chapters/:chapterId/regenerate',
    { preHandler: [fastify.verifyAuth] },
    async (request) => {
      const { chapterId } = chapterIdSchema.parse(request.params);
      const chapter = await assertChapterOwnership(chapterId, request.userAuth!.userId);
      const job = await createAndQueueJob({
        projectId: chapter.projectId,
        chapterId: chapter.id,
        type: 'regenerate_chapter',
        input: {},
      });
      return { jobId: job.id };
    },
  );

  fastify.post(
    '/chapters/:chapterId/continue',
    { preHandler: [fastify.verifyAuth] },
    async (request) => {
      const { chapterId } = chapterIdSchema.parse(request.params);
      const chapter = await assertChapterOwnership(chapterId, request.userAuth!.userId);
      const job = await createAndQueueJob({
        projectId: chapter.projectId,
        chapterId: chapter.id,
        type: 'continue_chapter',
        input: {},
      });
      return { jobId: job.id };
    },
  );

  fastify.post(
    '/chapters/:chapterId/summarize',
    { preHandler: [fastify.verifyAuth] },
    async (request) => {
      const { chapterId } = chapterIdSchema.parse(request.params);
      const chapter = await assertChapterOwnership(chapterId, request.userAuth!.userId);
      const job = await createAndQueueJob({
        projectId: chapter.projectId,
        chapterId: chapter.id,
        type: 'summarize_chapter',
        input: {},
      });
      return { jobId: job.id };
    },
  );
};
