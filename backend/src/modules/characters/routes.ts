import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';
import { getOwnedProject } from '../projects/service.js';
import { publishProjectRefresh } from '../realtime/pubsub.js';
import { getCharacter, listProjectCharacters, updateCharacter } from './service.js';

const paramsProject = z.object({ projectId: z.string().uuid() });
const paramsCharacter = z.object({ characterId: z.string().uuid() });

const patchCharacterSchema = z.object({
  name: z.string().optional(),
  role: z.string().optional(),
  description: z.string().optional(),
  traitsJson: z.array(z.string()).optional(),
  goalsJson: z.array(z.string()).optional(),
  relationshipsJson: z.record(z.any()).optional(),
  emotionalState: z.string().optional(),
  currentArc: z.string().optional(),
  knownFactsJson: z.array(z.string()).optional(),
  firstAppearedChapterId: z.string().uuid().nullable().optional(),
  lastSeenChapterId: z.string().uuid().nullable().optional(),
});

export const charactersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/projects/:projectId/characters',
    { preHandler: [fastify.verifyAuth] },
    async (request, reply) => {
      const { projectId } = paramsProject.parse(request.params);
      await getOwnedProject(projectId, request.userAuth!.userId);
      const rows = await listProjectCharacters(projectId);
      return reply.send(rows);
    },
  );

  fastify.get('/characters/:characterId', { preHandler: [fastify.verifyAuth] }, async (request) => {
    const { characterId } = paramsCharacter.parse(request.params);
    return getCharacter(characterId, request.userAuth!.userId);
  });

  fastify.patch(
    '/characters/:characterId',
    { preHandler: [fastify.verifyAuth] },
    async (request) => {
      const { characterId } = paramsCharacter.parse(request.params);
      const body = patchCharacterSchema.parse(request.body);
      const character = await updateCharacter(characterId, request.userAuth!.userId, body);
      await publishProjectRefresh({
        projectId: character.projectId,
        chapterId: character.lastSeenChapterId,
        reason: 'character.updated',
      });
      return character;
    },
  );
};
