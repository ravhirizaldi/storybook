import websocket from '@fastify/websocket';
import fp from 'fastify-plugin';
import type { WebSocket } from 'ws';
import { Redis } from 'ioredis';
import { and, eq } from 'drizzle-orm';
import { env } from '../../config/env.js';
import { db } from '../../db/index.js';
import { projects } from '../../db/schema.js';
import { REALTIME_CHANNEL, type RealtimeEvent } from './types.js';

type JwtPayload = {
  sub: string;
  username: string;
};

const projectSockets = new Map<string, Set<WebSocket>>();

function extractProjectId(request: any): string {
  const fromParams = request?.params?.projectId;
  if (typeof fromParams === 'string' && fromParams.length > 0) return fromParams;
  const rawUrl = request?.raw?.url;
  if (!rawUrl) return '';
  const pathname = new URL(rawUrl, 'http://localhost').pathname;
  const match = pathname.match(/\/ws\/projects\/([^/]+)/);
  return match?.[1] ?? '';
}

function extractToken(request: any): string {
  const queryToken = request?.query?.token;
  if (typeof queryToken === 'string' && queryToken.length > 0) return queryToken;

  const authHeader = request?.headers?.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length);
  }

  const protocols = request?.headers?.['sec-websocket-protocol'];
  if (typeof protocols === 'string') {
    const tokenProtocol = protocols
      .split(',')
      .map((item: string) => item.trim())
      .find((item: string) => item.startsWith('token.'));
    if (tokenProtocol) return tokenProtocol.slice('token.'.length);
  }

  const rawUrl = request?.raw?.url;
  if (!rawUrl) return '';
  return new URL(rawUrl, 'http://localhost').searchParams.get('token') ?? '';
}

function addSocket(projectId: string, socket: WebSocket) {
  const set = projectSockets.get(projectId) ?? new Set<WebSocket>();
  set.add(socket);
  projectSockets.set(projectId, set);
}

function removeSocket(projectId: string, socket: WebSocket) {
  const set = projectSockets.get(projectId);
  if (!set) return;
  set.delete(socket);
  if (set.size === 0) projectSockets.delete(projectId);
}

function broadcastProjectEvent(event: RealtimeEvent) {
  const sockets = projectSockets.get(event.projectId);
  if (!sockets || sockets.size === 0) return;
  const payload = JSON.stringify(event);
  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN) {
      socket.send(payload);
    }
  }
}

export const realtimeRoutes = fp(async (fastify) => {
  await fastify.register(websocket);

  const subscriber = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  await subscriber.subscribe(REALTIME_CHANNEL);
  subscriber.on('message', (_channel, message) => {
    try {
      const event = JSON.parse(message) as RealtimeEvent;
      broadcastProjectEvent(event);
    } catch (error) {
      fastify.log.error(error);
    }
  });

  fastify.addHook('onClose', async () => {
    await subscriber.quit();
  });

  (fastify as any).get(
    '/ws/projects/:projectId',
    { websocket: true },
    async (socket: WebSocket, request: any) => {
      try {
        const projectId = extractProjectId(request);
        const token = extractToken(request);
        if (!token || !projectId) {
          fastify.log.warn({ projectId }, 'WS rejected: missing token or projectId');
          socket.close(1008, 'Missing token or projectId');
          return;
        }

        const payload = (await fastify.jwt.verify(token)) as JwtPayload;
        const owned = await db
          .select({ id: projects.id })
          .from(projects)
          .where(and(eq(projects.id, projectId), eq(projects.userId, payload.sub)))
          .limit(1);
        if (!owned[0]) {
          fastify.log.warn(
            { projectId, userId: payload.sub, username: payload.username },
            'WS rejected: project ownership failed',
          );
          socket.close(1008, 'Forbidden');
          return;
        }

        addSocket(projectId, socket);
        socket.send(
          JSON.stringify({
            type: 'project.refresh',
            projectId,
            reason: 'connected',
            at: new Date().toISOString(),
          } satisfies RealtimeEvent),
        );

        socket.on('close', () => removeSocket(projectId, socket));
        socket.on('error', () => removeSocket(projectId, socket));
      } catch {
        fastify.log.warn('WS rejected: unauthorized token');
        socket.close(1008, 'Unauthorized');
      }
    },
  );
});
