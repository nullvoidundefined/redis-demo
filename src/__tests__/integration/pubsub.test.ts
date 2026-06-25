// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest';
import { disconnectRedis } from '@/clients/redis/disconnectRedis';
import { publishMessage } from '@/services/pubsub/publishMessage';
import { subscribeToChannel } from '@/services/pubsub/subscribeToChannel';

afterAll(async () => {
    await disconnectRedis();
});

describe('pub/sub (integration)', () => {
    it('delivers a published message to a subscriber', async () => {
        const received: string[] = [];
        const unsubscribe = await subscribeToChannel((message) => received.push(message));
        await publishMessage('ping');
        await new Promise((resolve) => setTimeout(resolve, 200));
        unsubscribe();
        expect(received).toContain('ping');
    });
});
