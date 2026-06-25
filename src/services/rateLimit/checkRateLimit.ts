/** Fixed-window rate limiter: INCR the per-client counter, set the window TTL on
 * the first hit, and block once the count exceeds the limit. Sliding-window and
 * token-bucket are the production-grade alternatives (more accurate at window
 * edges); fixed-window is used here for teaching clarity. */
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { MAX_REQUESTS, RATE_LIMIT_KEY_PREFIX, WINDOW_SECONDS } from '@/constants/rateLimit';
import type { RateLimitResult } from '@/types/rateLimit';

export async function checkRateLimit(clientId: string): Promise<RateLimitResult> {
    const redis = getRedisClient();
    const key = `${RATE_LIMIT_KEY_PREFIX}${clientId}`;
    const count = await redis.incr(key);
    if (count === 1) {
        await redis.expire(key, WINDOW_SECONDS);
    }
    const resetIn = await redis.ttl(key);
    if (count > MAX_REQUESTS) {
        return { allowed: false, remaining: 0, resetIn };
    }
    return { allowed: true, remaining: MAX_REQUESTS - count, resetIn };
}
