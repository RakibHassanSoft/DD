import { Queue, type JobsOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../../config/env.js';

export const emailQueueName = 'campaign-email';
let connection: Redis | undefined; let queue: Queue | undefined;
export function queueConnection() { if (!env.REDIS_URL) return null; connection ??= new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }); return connection; }
export function emailQueue() { const redis = queueConnection(); if (!redis) return null; queue ??= new Queue(emailQueueName, { connection: redis, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 60_000 }, removeOnComplete: 1000, removeOnFail: 2000 } }); return queue; }
export const emailJobOptions = (scheduledAt: Date): JobsOptions => ({ delay: Math.max(0, scheduledAt.getTime() - Date.now()) });
