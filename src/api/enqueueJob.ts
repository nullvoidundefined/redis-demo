/** Browser wrapper for POST /api/jobs. */
import type { JobType } from '@/types/job';

export async function enqueueJob(type: JobType, label: string): Promise<string> {
    const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, label }),
    });
    if (!response.ok) {
        throw new Error(`Enqueue failed: ${response.status}`);
    }
    const body = await response.json();
    return body.jobId;
}
