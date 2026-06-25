/** Factory for ioredis connections built from REDIS_URL. Callers pass options
 * (BullMQ requires maxRetriesPerRequest: null on its connections). */
import Redis, { type RedisOptions } from 'ioredis';
import { loadConfig } from '@/config/loadConfig';

export function createRedisClient(options: RedisOptions = {}): Redis {
    const { REDIS_URL } = loadConfig();
    return new Redis(REDIS_URL, options);
}
