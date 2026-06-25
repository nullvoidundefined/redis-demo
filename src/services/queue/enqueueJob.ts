/** Adds a job to the demo queue with the configured retry/backoff policy. */
import { BACKOFF_DELAY_MS, JOB_ATTEMPTS, JOB_NAME } from '@/constants/queue';
import type { JobType } from '@/types/job';
import { getJobQueue } from './getJobQueue';

export async function enqueueJob(type: JobType, label: string): Promise<string> {
    const job = await getJobQueue().add(
        JOB_NAME,
        { type, label },
        { attempts: JOB_ATTEMPTS, backoff: { type: 'exponential', delay: BACKOFF_DELAY_MS } },
    );
    if (!job.id) {
        throw new Error('Job was created without an id');
    }
    return job.id;
}
