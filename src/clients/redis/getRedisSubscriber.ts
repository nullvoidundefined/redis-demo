/** Dedicated connection used only for pub/sub subscribe. Kept separate because a
 * connection in subscriber mode rejects ordinary commands. */
import type Redis from 'ioredis';
import { createRedisClient } from './createRedisClient';
import { redisConnections } from './redisConnections';

export function getRedisSubscriber(): Redis {
    if (!redisConnections.subscriber) {
        redisConnections.subscriber = createRedisClient();
    }
    return redisConnections.subscriber;
}
