/** Dedicated connection used only for pub/sub subscribe. Kept separate because a
 * connection in subscriber mode rejects ordinary commands. */
import type Redis from 'ioredis';
import { createRedisClient } from './createRedisClient';

let subscriber: Redis | undefined;

export function getRedisSubscriber(): Redis {
    if (!subscriber) {
        subscriber = createRedisClient();
    }
    return subscriber;
}
