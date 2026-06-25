import { describe, expect, it, vi } from 'vitest';

vi.mock('@/clients/redis/getRedisClient', () => ({
    getRedisClient: () => ({ set: vi.fn().mockResolvedValue('OK') }),
}));

import { processJob } from '@/services/queue/processJob';
import type { JobData } from '@/types/job';

function fakeJob(data: JobData, attemptsMade: number) {
    return { id: 'job-1', data, attemptsMade } as never;
}

describe('processJob', () => {
    it('throws for a flaky job on the first attempt', async () => {
        await expect(processJob(fakeJob({ type: 'flaky', label: 'x' }, 0))).rejects.toThrow(
            /Simulated failure/,
        );
    });

    it('resolves with a result for a normal job', async () => {
        const result = await processJob(fakeJob({ type: 'normal', label: 'welcome' }, 0));
        expect(result.label).toBe('welcome');
        expect(typeof result.processedAt).toBe('string');
    });

    it('resolves for a flaky job once it has retried enough', async () => {
        const result = await processJob(fakeJob({ type: 'flaky', label: 'ok-now' }, 2));
        expect(result.label).toBe('ok-now');
    });
});
