import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';
import { getJobById, listProjectJobs } from './service.js';
import { getOwnedProject } from '../projects/service.js';

const paramsProject = z.object({ projectId: z.string().uuid() });
const paramsJob = z.object({ jobId: z.string().uuid() });

export const jobsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/projects/:projectId/jobs',
    { preHandler: [fastify.verifyAuth] },
    async (request) => {
      const { projectId } = paramsProject.parse(request.params);
      await getOwnedProject(projectId, request.userAuth!.userId);
      return listProjectJobs(projectId);
    },
  );

  fastify.get('/jobs/:jobId', { preHandler: [fastify.verifyAuth] }, async (request, reply) => {
    const { jobId } = paramsJob.parse(request.params);
    const job = await getJobById(jobId);
    if (!job) return reply.code(404).send({ message: 'Job not found' });
    await getOwnedProject(job.projectId, request.userAuth!.userId);
    return job;
  });
};
