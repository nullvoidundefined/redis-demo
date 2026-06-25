/** Sliding-window rate limiter using a Redis sorted set: each request is a member
 * scored by timestamp; expired entries are evicted before counting, so the window
 * slides continuously instead of resetting in fixed blocks (more accurate at edges
 * than the fixed-window limiter, at the cost of more memory per client). */
import { randomUUID } from 'node:crypto';
import { getRedisClient } from '@/clients/redis/getRedisClient';
import {
    SLIDING_KEY_PREFIX,
    SLIDING_MAX_REQUESTS,
    SLIDING_WINDOW_SECONDS,
} from '@/constants/slidingRateLimit';
import type { RateLimitResult } from '@/types/rateLimit';

const MILLISECONDS_PER_SECOND = 1000;

export async function checkSlidingRateLimit(clientId: string): Promise<RateLimitResult> {
    const redis = getRedisClient();
    const key = `${SLIDING_KEY_PREFIX}${clientId}`;
    const now = Date.now();
    const windowMs = SLIDING_WINDOW_SECONDS * MILLISECONDS_PER_SECOND;
    const windowStart = now - windowMs;

    await redis.zremrangebyscore(key, 0, windowStart);
    await redis.zadd(key, now, `${now}:${randomUUID()}`);
    await redis.expire(key, SLIDING_WINDOW_SECONDS);
    const count = await redis.zcard(key);

    const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
    const oldestScore = oldest.length === 2 ? Number(oldest[1]) : now;
    const resetIn = Math.max(
        1,
        Math.ceil((oldestScore + windowMs - now) / MILLISECONDS_PER_SECOND),
    );

    if (count > SLIDING_MAX_REQUESTS) {
        return { allowed: false, remaining: 0, resetIn };
    }
    return { allowed: true, remaining: SLIDING_MAX_REQUESTS - count, resetIn };
}
