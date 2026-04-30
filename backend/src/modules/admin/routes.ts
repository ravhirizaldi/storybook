import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';
import { AppError } from '../../utils/errors.js';
import { getOrCreateAiRuntimeSettings, updateAiRuntimeSettings } from '../settings/service.js';

function assertAdmin(username?: string) {
  if (username !== 'admin') throw new AppError('Forbidden', 403);
}

const patchSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  model: z.string().min(1).optional(),
  embeddingModel: z.string().min(1).optional(),
  embeddingApiKey: z.string().optional(),
  embeddingBaseUrl: z.union([z.string().url(), z.literal('')]).optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().min(128).max(64000).optional(),
  contextMaxChars: z.number().int().min(2000).max(200000).optional(),
});

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/admin/ai-settings', { preHandler: [fastify.verifyAuth] }, async (request) => {
    assertAdmin(request.userAuth?.username);
    return getOrCreateAiRuntimeSettings();
  });

  fastify.patch('/admin/ai-settings', { preHandler: [fastify.verifyAuth] }, async (request) => {
    assertAdmin(request.userAuth?.username);
    const body = patchSchema.parse(request.body);
    return updateAiRuntimeSettings(body);
  });
};
