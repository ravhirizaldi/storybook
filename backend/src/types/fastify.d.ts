import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userAuth?: {
      userId: string;
      username: string;
    };
  }
}
