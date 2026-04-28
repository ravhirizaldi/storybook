import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';
import { findUserById, loginWithPassword } from './service.js';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const data = await loginWithPassword(fastify, body.username, body.password);
    return reply.send(data);
  });

  fastify.get('/auth/me', { preHandler: [fastify.verifyAuth] }, async (request, reply) => {
    const userAuth = request.userAuth;
    if (!userAuth) return reply.code(401).send({ message: 'Unauthorized' });
    const user = await findUserById(userAuth.userId);
    if (!user) return reply.code(404).send({ message: 'User not found' });
    return reply.send({ id: user.id, username: user.username, isAdmin: user.username === 'admin' });
  });
};
