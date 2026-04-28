import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';
import { getOwnedProject } from '../projects/service.js';
import { publishProjectRefresh } from '../realtime/pubsub.js';
import {
  createMemory,
  deleteMemory,
  listProjectMemories,
  semanticSearchMemories,
} from './service.js';

const projectParams = z.object({ projectId: z.string().uuid() });
const memoryParams = z.object({ memoryId: z.string().uuid() });

const listQuerySchema = z.object({
  type: z
    .enum([
      'story_bible',
      'plot',
      'character',
      'world',
      'chapter_summary',
      'emotional_state',
      'user_note',
    ])
    .optional(),
  characterId: z.string().uuid().optional(),
  chapterId: z.string().uuid().optional(),
});

const createMemorySchema = z.object({
  chapterId: z.string().uuid().nullable().optional(),
  characterId: z.string().uuid().nullable().optional(),
  type: z.enum([
    'story_bible',
    'plot',
    'character',
    'world',
    'chapter_summary',
    'emotional_state',
    'user_note',
  ]),
  title: z.string().min(1),
  content: z.string().min(1),
  importance: z.number().int().min(1).max(10).default(5),
  metadataJson: z.record(z.any()).optional(),
});

const searchSchema = z.object({
  query: z.string().min(2),
  limit: z.number().int().min(1).max(50).optional(),
  type: z
    .enum([
      'story_bible',
      'plot',
      'character',
      'world',
      'chapter_summary',
      'emotional_state',
      'user_note',
    ])
    .optional(),
});

export const memoriesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/projects/:projectId/memories',
    { preHandler: [fastify.verifyAuth] },
    async (request, reply) => {
      const { projectId } = projectParams.parse(request.params);
      await getOwnedProject(projectId, request.userAuth!.userId);
      const query = listQuerySchema.parse(request.query);
      const rows = await listProjectMemories(projectId, request.userAuth!.userId, query);
      return reply.send(rows);
    },
  );

  fastify.post(
    '/projects/:projectId/memories',
    { preHandler: [fastify.verifyAuth] },
    async (request, reply) => {
      const { projectId } = projectParams.parse(request.params);
      await getOwnedProject(projectId, request.userAuth!.userId);
      const body = createMemorySchema.parse(request.body);
      const row = await createMemory({
        projectId,
        ...body,
      });
      await publishProjectRefresh({
        projectId,
        chapterId: body.chapterId ?? null,
        reason: 'memory.created',
      });
      return reply.code(201).send(row);
    },
  );

  fastify.delete(
    '/memories/:memoryId',
    { preHandler: [fastify.verifyAuth] },
    async (request, reply) => {
      const { memoryId } = memoryParams.parse(request.params);
      const deleted = await deleteMemory(memoryId, request.userAuth!.userId);
      await publishProjectRefresh({
        projectId: deleted.projectId,
        chapterId: deleted.chapterId ?? null,
        reason: 'memory.deleted',
      });
      return reply.code(204).send();
    },
  );

  fastify.post(
    '/projects/:projectId/memories/search',
    { preHandler: [fastify.verifyAuth] },
    async (request, reply) => {
      const { projectId } = projectParams.parse(request.params);
      const body = searchSchema.parse(request.body);
      const rows = await semanticSearchMemories({
        projectId,
        userId: request.userAuth!.userId,
        query: body.query,
        limit: body.limit,
        type: body.type,
      });
      return reply.send(rows);
    },
  );
};
