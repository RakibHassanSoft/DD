import { connectDatabase } from './config/database.js';
import { emailQueueName, queueConnection } from './common/queue/email.queue.js';
import { Worker } from 'bullmq';
import { processCampaignEmail } from './modules/campaigns/campaign.worker.js';
import { logEvent } from './common/utils/logger.js';

async function bootstrap() { await connectDatabase(); const connection = queueConnection(); if (!connection) throw new Error('REDIS_URL is required to start the campaign worker.'); const worker = new Worker<{ emailJobId: string }>(emailQueueName, processCampaignEmail, { connection, concurrency: 2 }); worker.on('failed', (job, error) => logEvent('error', 'campaign_job_failed', { jobId: job?.id, errorMessage: error.message.slice(0, 300) })); worker.on('error', (error) => logEvent('error', 'queue_worker_error', { errorMessage: error.message.slice(0, 300) })); logEvent('info', 'campaign_worker_started', { concurrency: 2 }); }
bootstrap().catch((error) => { logEvent('error', 'campaign_worker_start_failed', { errorMessage: error instanceof Error ? error.message.slice(0, 300) : 'Unknown error' }); process.exit(1); });
