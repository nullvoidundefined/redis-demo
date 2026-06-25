/** Shared singleton connection for normal Redis commands (cache, rate limit,
 * queue producer). A subscribed connection cannot run these, so pub/sub uses a
 * separate connection (getRedisSubscriber). */
import type Redis from 'ioredis';
import { createRedisClient } from './createRedisClient';
import { redisConnections } from './redisConnections';

export function getRedisClient(): Redis {
    if (!redisConnections.client) {
        redisConnections.client = createRedisClient();
    }
    return redisConnections.client;
}
