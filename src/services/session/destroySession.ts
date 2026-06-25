/** Destroys a session by deleting its key (logout). */
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { SESSION_KEY_PREFIX } from '@/constants/session';

export async function destroySession(token: string): Promise<void> {
    await getRedisClient().del(`${SESSION_KEY_PREFIX}${token}`);
}
