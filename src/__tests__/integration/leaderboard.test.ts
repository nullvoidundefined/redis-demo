// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { LEADERBOARD_KEY } from '@/constants/leaderboard';
import { getLeaderboard } from '@/services/leaderboard/getLeaderboard';
import { submitScore } from '@/services/leaderboard/submitScore';

// LEADERBOARD_KEY is a shared demo key. Clearing it in beforeEach and afterAll
// is acceptable here because this is non-production demo data with no real value.
beforeEach(async () => {
    await getRedisClient().del(LEADERBOARD_KEY);
});

afterAll(async () => {
    await getRedisClient().del(LEADERBOARD_KEY);
    await getRedisClient().quit();
});

describe('leaderboard (integration)', () => {
    it('returns entries ordered high-to-low with correct 1-based ranks', async () => {
        await submitScore('Alice', 500);
        await submitScore('Bob', 900);
        await submitScore('Carol', 200);

        const entries = await getLeaderboard();

        expect(entries).toHaveLength(3);
        expect(entries[0]).toEqual({ name: 'Bob', score: 900, rank: 1 });
        expect(entries[1]).toEqual({ name: 'Alice', score: 500, rank: 2 });
        expect(entries[2]).toEqual({ name: 'Carol', score: 200, rank: 3 });
    });
});
