/** Creates a session: stores a small record under a random token with a TTL,
 * returns the token (the SET EX / GET / DEL lifecycle is the teaching point). */
import { randomUUID } from 'node:crypto';
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { SESSION_KEY_PREFIX, SESSION_TTL_SECONDS } from '@/constants/session';
import type { SessionRecord } from '@/types/session';

export async function createSession(label: string): Promise<string> {
    const token = randomUUID();
    const record: SessionRecord = { label, createdAt: new Date().toISOString() };
    await getRedisClient().set(
        `${SESSION_KEY_PREFIX}${token}`,
        JSON.stringify(record),
        'EX',
        SESSION_TTL_SECONDS,
    );
    return token;
}
