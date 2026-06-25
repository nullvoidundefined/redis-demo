import { describe, expect, it, vi } from 'vitest';

const { enqueueJob } = vi.hoisted(() => ({ enqueueJob: vi.fn() }));
const { listJobs } = vi.hoisted(() => ({ listJobs: vi.fn() }));
vi.mock('@/services/queue/enqueueJob', () => ({ enqueueJob }));
vi.mock('@/services/queue/listJobs', () => ({ listJobs }));

import { GET, POST } from '@/app/api/jobs/route';

function postJson(body: unknown) {
    return new Request('http://x/api/jobs', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/jobs', () => {
    it('enqueues a valid job and returns the id', async () => {
        enqueueJob.mockResolvedValueOnce('job-9');
        const response = await POST(postJson({ type: 'normal', label: 'hi' }));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ jobId: 'job-9' });
    });

    it('returns 400 for an invalid job type', async () => {
        const response = await POST(postJson({ type: 'bogus', label: 'hi' }));
        expect(response.status).toBe(400);
    });

    it('returns 400 for a missing label', async () => {
        const response = await POST(postJson({ type: 'normal' }));
        expect(response.status).toBe(400);
    });
});

describe('GET /api/jobs', () => {
    it('returns the job list', async () => {
        listJobs.mockResolvedValueOnce([{ id: 'job-1', state: 'completed' }]);
        const response = await GET();
        expect(await response.json()).toHaveLength(1);
    });
});
