import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';
import { getOwnedProject, listProjectParts } from '../projects/service.js';

const paramsProject = z.object({ projectId: z.string().uuid() });

export const partsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/projects/:projectId/parts',
    { preHandler: [fastify.verifyAuth] },
    async (request) => {
      const { projectId } = paramsProject.parse(request.params);
      await getOwnedProject(projectId, request.userAuth!.userId);
      return listProjectParts(projectId);
    },
  );
};
