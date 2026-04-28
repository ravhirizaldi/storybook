import { Redis } from 'ioredis';
import { Queue } from 'bullmq';
import { env } from '../config/env.js';
import type { jobTypeEnum } from '../db/schema.js';

export type JobType = (typeof jobTypeEnum.enumValues)[number];

export type QueueJobPayload = {
  jobId: string;
  projectId: string;
  chapterId?: string | null;
  type: JobType;
  input: Record<string, unknown>;
};

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const generationQueue = new Queue<QueueJobPayload>('story-generation', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 100,
    attempts: 1,
  },
});
