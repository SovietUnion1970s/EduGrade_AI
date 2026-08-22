import { Queue } from 'bullmq';
import { getRedisClient } from '@/lib/redis';

export const GRADING_QUEUE_NAME = 'edugrade-ai-grading-queue';

export const gradingQueue = new Queue(GRADING_QUEUE_NAME, {
  connection: getRedisClient() as any,
});
