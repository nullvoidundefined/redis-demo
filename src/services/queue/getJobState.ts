/** Reads a single job's current state, or null when it no longer exists. */
import type { JobSummary } from '@/types/job';
import { getJobQueue } from './getJobQueue';
import { toJobSummary } from './toJobSummary';

export async function getJobState(id: string): Promise<JobSummary | null> {
    const job = await getJobQueue().getJob(id);
    if (!job) {
        return null;
    }
    return toJobSummary(job, await job.getState());
}
