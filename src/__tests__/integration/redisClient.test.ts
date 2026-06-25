// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest';
import { createRedisClient } from '@/clients/redis/createRedisClient';

const client = createRedisClient();

afterAll(async () => {
    await client.quit();
});

describe('redis client (integration)', () => {
    it('connects and responds to PING', async () => {
        expect(await client.ping()).toBe('PONG');
    });

    it('round-trips a value', async () => {
        const key = `test:redisClient:${process.pid}`;
        await client.set(key, 'hello');
        expect(await client.get(key)).toBe('hello');
        await client.del(key);
    });
});
