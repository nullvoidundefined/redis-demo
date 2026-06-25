/** Publishes a message to the demo channel (fire-and-forget; no persistence). */
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { CHANNEL } from '@/constants/pubsub';

export async function publishMessage(message: string): Promise<void> {
    await getRedisClient().publish(CHANNEL, message);
}
