import fp from 'fastify-plugin';
import type { FastifyReply, FastifyRequest } from 'fastify';

type JwtPayload = {
  sub: string;
  username: string;
};

export const authPlugin = fp(async (fastify) => {
  fastify.decorate(
    'verifyAuth',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        const payload = (await request.jwtVerify()) as JwtPayload;
        request.userAuth = {
          userId: payload.sub,
          username: payload.username,
        };
      } catch {
        reply.code(401).send({ message: 'Unauthorized' });
      }
    },
  );
});

declare module 'fastify' {
  interface FastifyInstance {
    verifyAuth(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}
