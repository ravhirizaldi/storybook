import { Redis } from 'ioredis';
import { env } from '../../config/env.js';
import { REALTIME_CHANNEL, type RealtimeEvent } from './types.js';

const publisher = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export async function publishProjectRefresh(event: {
  projectId: string;
  reason: string;
  chapterId?: string | null;
}) {
  const payload: RealtimeEvent = {
    type: 'project.refresh',
    projectId: event.projectId,
    reason: event.reason,
    chapterId: event.chapterId ?? null,
    at: new Date().toISOString(),
  };
  await publisher.publish(REALTIME_CHANNEL, JSON.stringify(payload));
}

export async function closeRealtimePublisher() {
  await publisher.quit();
}
