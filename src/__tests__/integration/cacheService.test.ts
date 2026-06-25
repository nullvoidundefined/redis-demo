// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { CACHE_KEY_PREFIX } from '@/constants/cache';

const FULL_NAME = 'redis/redis';
const STATS = {
    fullName: FULL_NAME,
    description: 'desc',
    stars: 1,
    forks: 2,
    openIssues: 3,
    language: 'C',
};

vi.mock('@/clients/github/getRepoStats', () => ({
    getRepoStats: vi.fn().mockResolvedValue({
        fullName: 'redis/redis',
        description: 'desc',
        stars: 1,
        forks: 2,
        openIssues: 3,
        language: 'C',
    }),
}));

import { getRepoStats } from '@/clients/github/getRepoStats';
import { getCachedRepo } from '@/services/cache/getCachedRepo';
import { invalidateCachedRepo } from '@/services/cache/invalidateCachedRepo';

beforeEach(async () => {
    vi.clearAllMocks();
    await getRedisClient().del(`${CACHE_KEY_PREFIX}${FULL_NAME}`);
});

afterAll(async () => {
    await getRedisClient().del(`${CACHE_KEY_PREFIX}${FULL_NAME}`);
    await getRedisClient().quit();
});

describe('getCachedRepo (integration)', () => {
    it('MISS then HIT: second call serves from cache without re-fetching', async () => {
        const first = await getCachedRepo(FULL_NAME);
        expect(first.source).toBe('MISS');
        expect(first.data).toEqual(STATS);

        const second = await getCachedRepo(FULL_NAME);
        expect(second.source).toBe('HIT');
        expect(second.data).toEqual(STATS);
        expect(getRepoStats).toHaveBeenCalledTimes(1);
    });

    it('invalidate forces the next call to MISS again', async () => {
        await getCachedRepo(FULL_NAME);
        await invalidateCachedRepo(FULL_NAME);
        const after = await getCachedRepo(FULL_NAME);
        expect(after.source).toBe('MISS');
        expect(getRepoStats).toHaveBeenCalledTimes(2);
    });
});
