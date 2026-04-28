import { Worker } from 'bullmq';
import { redisConnection } from './queues.js';
import { processGenerationJob } from './processors/generationProcessor.js';

const worker = new Worker('story-generation', processGenerationJob, {
  connection: redisConnection,
  concurrency: 2,
});

worker.on('completed', (job) => {
  console.log(`[worker] completed ${job.id} (${job.name})`);
});

worker.on('failed', (job, err) => {
  console.error(`[worker] failed ${job?.id} (${job?.name}):`, err.message);
});

console.log('[worker] story-generation worker started');
