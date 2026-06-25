// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { MAX_REQUESTS, RATE_LIMIT_KEY_PREFIX } from '@/constants/rateLimit';
import { checkRateLimit } from '@/services/rateLimit/checkRateLimit';

const CLIENT_ID = `test-${process.pid}`;

beforeEach(async () => {
    await getRedisClient().del(`${RATE_LIMIT_KEY_PREFIX}${CLIENT_ID}`);
});

afterAll(async () => {
    await getRedisClient().del(`${RATE_LIMIT_KEY_PREFIX}${CLIENT_ID}`);
    await getRedisClient().quit();
});

describe('checkRateLimit (integration)', () => {
    it('allows up to MAX_REQUESTS then blocks', async () => {
        let last = await checkRateLimit(CLIENT_ID);
        for (let i = 1; i < MAX_REQUESTS; i += 1) {
            last = await checkRateLimit(CLIENT_ID);
        }
        expect(last.allowed).toBe(true);
        expect(last.remaining).toBe(0);
        expect(last.resetIn).toBeGreaterThan(0);

        const blocked = await checkRateLimit(CLIENT_ID);
        expect(blocked.allowed).toBe(false);
        expect(blocked.remaining).toBe(0);
        expect(blocked.resetIn).toBeGreaterThan(0);
    });
});
