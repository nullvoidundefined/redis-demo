/** Lazily builds the shared BullMQ Queue (producer side). BullMQ requires a
 * connection with maxRetriesPerRequest: null, so it gets its own ioredis
 * connection rather than reusing the shared command client. The cast is needed
 * because BullMQ bundles its own ioredis minor version whose types diverge
 * from the project ioredis, though the instances are wire-compatible. */
import { type ConnectionOptions, Queue } from 'bullmq';
import { createRedisClient } from '@/clients/redis/createRedisClient';
import { QUEUE_NAME } from '@/constants/queue';

let queue: Queue | undefined;

export function getJobQueue(): Queue {
    if (!queue) {
        queue = new Queue(QUEUE_NAME, {
            connection: createRedisClient({ maxRetriesPerRequest: null }) as unknown as ConnectionOptions,
        });
    }
    return queue;
}
