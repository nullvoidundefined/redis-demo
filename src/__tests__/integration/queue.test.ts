// @vitest-environment node
import { type ConnectionOptions, Worker } from 'bullmq';
import { afterAll, describe, expect, it } from 'vitest';
import { createRedisClient } from '@/clients/redis/createRedisClient';
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { QUEUE_NAME, RESULT_KEY_PREFIX } from '@/constants/queue';
import { enqueueJob } from '@/services/queue/enqueueJob';
import { getJobQueue } from '@/services/queue/getJobQueue';
import { getJobState } from '@/services/queue/getJobState';
import { processJob } from '@/services/queue/processJob';

// BullMQ bundles a different ioredis patch version; runtime-compatible, type skew only.
const worker = new Worker(QUEUE_NAME, processJob, {
    connection: createRedisClient({ maxRetriesPerRequest: null }) as unknown as ConnectionOptions,
});

afterAll(async () => {
    await worker.close();
    await getJobQueue().close();
    await getRedisClient().quit();
});

function waitForCompletion(jobId: string): Promise<void> {
    return new Promise((resolve, reject) => {
        worker.on('completed', (job) => {
            if (job.id === jobId) resolve();
        });
        worker.on('failed', (job, err) => {
            if (job?.id === jobId) reject(err);
        });
    });
}

describe('job queue (integration)', () => {
    it('processes a normal job to completion and stores a result', async () => {
        const jobId = await enqueueJob('normal', 'welcome-email');
        await waitForCompletion(jobId);
        const summary = await getJobState(jobId);
        expect(summary?.state).toBe('completed');
        expect(summary?.returnValue?.label).toBe('welcome-email');
        const stored = await getRedisClient().get(`${RESULT_KEY_PREFIX}${jobId}`);
        expect(stored).toContain('welcome-email');
    }, 15000);
});
