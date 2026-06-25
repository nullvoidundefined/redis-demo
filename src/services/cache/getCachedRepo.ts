/** Cache-aside read for GitHub repo stats: serve from Redis on HIT, otherwise
 * fetch the slow source and populate the key with a TTL. */
import { getRepoStats } from '@/clients/github/getRepoStats';
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { CACHE_KEY_PREFIX, CACHE_TTL_SECONDS } from '@/constants/cache';
import type { CachedRepoResult } from '@/types/cacheResult';
import type { RepoStats } from '@/types/repoStats';

export async function getCachedRepo(fullName: string): Promise<CachedRepoResult> {
    const redis = getRedisClient();
    const key = `${CACHE_KEY_PREFIX}${fullName}`;
    const cached = await redis.get(key);
    if (cached) {
        const ttl = await redis.ttl(key);
        return { source: 'HIT', data: JSON.parse(cached) as RepoStats, ttl };
    }
    const data = await getRepoStats(fullName);
    await redis.set(key, JSON.stringify(data), 'EX', CACHE_TTL_SECONDS);
    return { source: 'MISS', data, ttl: CACHE_TTL_SECONDS };
}
