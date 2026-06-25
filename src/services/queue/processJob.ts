/** Worker job handler. A 'flaky' job fails on its first two attempts then
 * succeeds, demonstrating BullMQ retries + exponential backoff. Every successful
 * run writes a result record to Redis so the UI can show what was processed. */
import type { Job } from 'bullmq';
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { RESULT_KEY_PREFIX, RESULT_TTL_SECONDS } from '@/constants/queue';
import type { JobData, JobResult } from '@/types/job';

const FLAKY_SUCCESS_ATTEMPT = 2;

export async function processJob(job: Job<JobData>): Promise<JobResult> {
    const { type, label } = job.data;
    console.info(`processing ${job.id} (${type})`);
    if (type === 'flaky' && job.attemptsMade < FLAKY_SUCCESS_ATTEMPT) {
        throw new Error(`Simulated failure for job ${job.id} (attempt ${job.attemptsMade + 1})`);
    }
    const result: JobResult = { label, processedAt: new Date().toISOString() };
    await getRedisClient().set(
        `${RESULT_KEY_PREFIX}${job.id}`,
        JSON.stringify(result),
        'EX',
        RESULT_TTL_SECONDS,
    );
    return result;
}
