/** Lists recent jobs across lifecycle states for the job board. */
import type { JobSummary } from '@/types/job';
import { getJobQueue } from './getJobQueue';
import { toJobSummary } from './toJobSummary';

const LIST_LIMIT = 20;

export async function listJobs(): Promise<JobSummary[]> {
    const queue = getJobQueue();
    const jobs = await queue.getJobs(
        ['waiting', 'active', 'completed', 'failed', 'delayed'],
        0,
        LIST_LIMIT,
    );
    return Promise.all(
        jobs.filter(Boolean).map(async (job) => toJobSummary(job, await job.getState())),
    );
}
