/** Removes a cached repo entry so the next read re-fetches the source. */
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { CACHE_KEY_PREFIX } from '@/constants/cache';

export async function invalidateCachedRepo(fullName: string): Promise<void> {
    await getRedisClient().del(`${CACHE_KEY_PREFIX}${fullName}`);
}
