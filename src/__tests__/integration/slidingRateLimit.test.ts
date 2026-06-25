// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { SLIDING_KEY_PREFIX, SLIDING_MAX_REQUESTS } from '@/constants/slidingRateLimit';
import { checkSlidingRateLimit } from '@/services/rateLimit/checkSlidingRateLimit';

const CLIENT_ID = `test-sliding-${process.pid}`;

beforeEach(async () => {
    await getRedisClient().del(`${SLIDING_KEY_PREFIX}${CLIENT_ID}`);
});

afterAll(async () => {
    await getRedisClient().del(`${SLIDING_KEY_PREFIX}${CLIENT_ID}`);
    await getRedisClient().quit();
});

describe('checkSlidingRateLimit (integration)', () => {
    it('allows up to SLIDING_MAX_REQUESTS then blocks', async () => {
        let last = await checkSlidingRateLimit(CLIENT_ID);
        for (let i = 1; i < SLIDING_MAX_REQUESTS; i += 1) {
            last = await checkSlidingRateLimit(CLIENT_ID);
        }
        expect(last.allowed).toBe(true);
        expect(last.remaining).toBe(0);
        expect(last.resetIn).toBeGreaterThan(0);

        const blocked = await checkSlidingRateLimit(CLIENT_ID);
        expect(blocked.allowed).toBe(false);
        expect(blocked.remaining).toBe(0);
        expect(blocked.resetIn).toBeGreaterThan(0);
    });
});
