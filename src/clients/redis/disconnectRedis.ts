/** Graceful shutdown of the shared connections (used by the worker and tests).
 * Quits only the connections that were actually created, then clears them so a
 * later getter re-creates a fresh connection. */
import { redisConnections } from './redisConnections';

export async function disconnectRedis(): Promise<void> {
    const pending: Promise<unknown>[] = [];
    if (redisConnections.client) {
        pending.push(redisConnections.client.quit());
        redisConnections.client = undefined;
    }
    if (redisConnections.subscriber) {
        pending.push(redisConnections.subscriber.quit());
        redisConnections.subscriber = undefined;
    }
    await Promise.all(pending);
}
