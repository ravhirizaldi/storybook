import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';
import { createAndQueueJob } from '../jobs/service.js';
import { publishProjectRefresh } from '../realtime/pubsub.js';
import {
  createProject,
  deleteProject,
  getChapterIdsForProject,
  getOwnedProject,
  getProjectDetail,
  listProjectsForUser,
  updateProject,
} from './service.js';

const paramsProject = z.object({ projectId: z.string().uuid() });

const createProjectSchema = z.object({
  masterPrompt: z.string().min(20),
  outputLanguage: z.string().default('English'),
  tone: z.string().default('Balanced'),
  genre: z.string().default('Fiction'),
  targetChapterCount: z.number().int().min(1).max(120).default(20),
  temperature: z.number().min(0).max(2).default(0.85),
  pacing: z.string().default('Medium'),
});

const updateProjectSchema = z.object({
  title: z.string().min(1).optional(),
  outputLanguage: z.string().optional(),
  tone: z.string().optional(),
  genre: z.string().optional(),
  pacing: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  status: z.enum(['draft', 'outlining', 'ready', 'generating', 'failed']).optional(),
});

export const projectsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/projects', { preHandler: [fastify.verifyAuth] }, async (request) => {
    return listProjectsForUser(request.userAuth!.userId);
  });

  fastify.post('/projects', { preHandler: [fastify.verifyAuth] }, async (request, reply) => {
    const body = createProjectSchema.parse(request.body);
    const project = await createProject({
      userId: request.userAuth!.userId,
      ...body,
    });

    const job = await createAndQueueJob({
      projectId: project.id,
      type: 'generate_outline',
      input: { targetChapterCount: body.targetChapterCount },
    });

    return reply.code(201).send({ project, jobId: job.id });
  });

  fastify.get('/projects/:projectId', { preHandler: [fastify.verifyAuth] }, async (request) => {
    const { projectId } = paramsProject.parse(request.params);
    return getProjectDetail(projectId, request.userAuth!.userId);
  });

  fastify.patch('/projects/:projectId', { preHandler: [fastify.verifyAuth] }, async (request) => {
    const { projectId } = paramsProject.parse(request.params);
    const body = updateProjectSchema.parse(request.body);
    const project = await updateProject(projectId, request.userAuth!.userId, body);
    await publishProjectRefresh({
      projectId,
      reason: 'project.updated',
    });
    return project;
  });

  fastify.delete(
    '/projects/:projectId',
    { preHandler: [fastify.verifyAuth] },
    async (request, reply) => {
      const { projectId } = paramsProject.parse(request.params);
      await deleteProject(projectId, request.userAuth!.userId);
      await publishProjectRefresh({
        projectId,
        reason: 'project.deleted',
      });
      return reply.code(204).send();
    },
  );

  fastify.post(
    '/projects/:projectId/generate-outline',
    { preHandler: [fastify.verifyAuth] },
    async (request, reply) => {
      const { projectId } = paramsProject.parse(request.params);
      await getOwnedProject(projectId, request.userAuth!.userId);
      const job = await createAndQueueJob({
        projectId,
        type: 'generate_outline',
        input: {},
      });
      return reply.send({ jobId: job.id });
    },
  );

  fastify.post(
    '/projects/:projectId/generate-all-chapters',
    { preHandler: [fastify.verifyAuth] },
    async (request) => {
      const { projectId } = paramsProject.parse(request.params);
      await getOwnedProject(projectId, request.userAuth!.userId);
      const chapterIds = await getChapterIdsForProject(projectId);
      const jobs = await Promise.all(
        chapterIds.map((chapterId) =>
          createAndQueueJob({
            projectId,
            chapterId,
            type: 'generate_chapter',
            input: {},
          }),
        ),
      );
      return { jobIds: jobs.map((job) => job.id), count: jobs.length };
    },
  );
};
