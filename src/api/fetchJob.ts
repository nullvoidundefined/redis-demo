/** Browser wrapper for GET /api/jobs/:id. */
import type { JobSummary } from '@/types/job';

export async function fetchJob(id: string): Promise<JobSummary> {
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}`);
    if (!response.ok) {
        throw new Error(`Fetch job failed: ${response.status}`);
    }
    return response.json();
}
