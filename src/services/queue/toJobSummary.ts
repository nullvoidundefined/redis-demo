/** Maps a BullMQ Job (plus its resolved state) to the UI-facing JobSummary. */
import type { Job, JobState } from 'bullmq';
import type { JobSummary } from '@/types/job';

export function toJobSummary(job: Job, state: JobState | 'unknown'): JobSummary {
    return {
        id: job.id ?? '',
        state,
        type: job.data.type,
        label: job.data.label,
        attemptsMade: job.attemptsMade,
        returnValue: job.returnvalue ?? null,
        failedReason: job.failedReason ?? null,
    };
}
