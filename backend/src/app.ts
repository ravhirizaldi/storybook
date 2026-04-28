import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import fastifyJwt from '@fastify/jwt';
import { env } from './config/env.js';
import { authPlugin } from './modules/auth/plugin.js';
import { authRoutes } from './modules/auth/routes.js';
import { adminRoutes } from './modules/admin/routes.js';
import { chaptersRoutes } from './modules/chapters/routes.js';
import { charactersRoutes } from './modules/characters/routes.js';
import { jobsRoutes } from './modules/jobs/routes.js';
import { memoriesRoutes } from './modules/memories/routes.js';
import { partsRoutes } from './modules/parts/routes.js';
import { projectsRoutes } from './modules/projects/routes.js';
import { realtimeRoutes } from './modules/realtime/routes.js';
import { AppError } from './utils/errors.js';

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.register(cors, {
    origin: true,
    credentials: true,
  });
  app.register(sensible);
  app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  });
  app.register(authPlugin);
  app.register(realtimeRoutes);

  app.get('/health', async () => ({ ok: true }));

  app.register(authRoutes);
  app.register(adminRoutes);
  app.register(projectsRoutes);
  app.register(partsRoutes);
  app.register(chaptersRoutes);
  app.register(charactersRoutes);
  app.register(memoriesRoutes);
  app.register(jobsRoutes);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        message: error.message,
        details: error.details,
      });
    }
    const fastifyError = error as { statusCode?: number; message?: string };
    if (fastifyError.statusCode) {
      return reply.code(fastifyError.statusCode).send({
        message: fastifyError.message ?? 'Request failed',
      });
    }
    app.log.error(error);
    return reply.code(500).send({ message: 'Internal Server Error' });
  });

  return app;
}
