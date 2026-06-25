/** Browser wrapper for GET /api/jobs. */
import type { JobSummary } from '@/types/job';

export async function fetchJobs(): Promise<JobSummary[]> {
    const response = await fetch('/api/jobs');
    if (!response.ok) {
        throw new Error(`Fetch jobs failed: ${response.status}`);
    }
    return response.json();
}
