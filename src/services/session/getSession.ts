/** Reads a session record and its remaining TTL, or null if it has expired/never existed. */
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { SESSION_KEY_PREFIX } from '@/constants/session';
import type { SessionRecord, SessionView } from '@/types/session';

export async function getSession(token: string): Promise<SessionView | null> {
    const redis = getRedisClient();
    const key = `${SESSION_KEY_PREFIX}${token}`;
    const raw = await redis.get(key);
    if (!raw) {
        return null;
    }
    const data = JSON.parse(raw) as SessionRecord;
    return { token, data, ttl: await redis.ttl(key) };
}
