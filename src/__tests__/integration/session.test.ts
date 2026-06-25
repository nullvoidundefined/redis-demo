// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest';
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { SESSION_KEY_PREFIX } from '@/constants/session';

import { createSession } from '@/services/session/createSession';
import { destroySession } from '@/services/session/destroySession';
import { getSession } from '@/services/session/getSession';

const createdTokens: string[] = [];

afterAll(async () => {
    const redis = getRedisClient();
    for (const token of createdTokens) {
        await redis.del(`${SESSION_KEY_PREFIX}${token}`);
    }
    await redis.quit();
});

describe('session services (integration)', () => {
    it('creates a session and reads it back with ttl > 0', async () => {
        const token = await createSession('test-label');
        createdTokens.push(token);

        const view = await getSession(token);
        expect(view).not.toBeNull();
        expect(view!.token).toBe(token);
        expect(view!.data.label).toBe('test-label');
        expect(view!.ttl).toBeGreaterThan(0);
    });

    it('returns null after the session is destroyed', async () => {
        const token = await createSession('to-destroy');
        createdTokens.push(token);

        await destroySession(token);
        const view = await getSession(token);
        expect(view).toBeNull();
    });
});
