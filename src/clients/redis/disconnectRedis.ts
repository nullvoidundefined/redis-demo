/** Graceful shutdown of the shared connections (used by the worker and tests). */
import { getRedisClient } from './getRedisClient';
import { getRedisSubscriber } from './getRedisSubscriber';

export async function disconnectRedis(): Promise<void> {
    await Promise.all([getRedisClient().quit(), getRedisSubscriber().quit()]);
}
