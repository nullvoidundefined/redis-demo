/** Subscribes to the demo channel on the dedicated subscriber connection and
 * invokes onMessage for each message. Returns an unsubscribe that detaches this
 * listener (the shared subscriber stays subscribed for other live clients). */
import { getRedisSubscriber } from '@/clients/redis/getRedisSubscriber';
import { CHANNEL } from '@/constants/pubsub';

export async function subscribeToChannel(
    onMessage: (message: string) => void,
): Promise<() => void> {
    const subscriber = getRedisSubscriber();
    await subscriber.subscribe(CHANNEL);
    const handler = (channel: string, message: string) => {
        if (channel === CHANNEL) {
            onMessage(message);
        }
    };
    subscriber.on('message', handler);
    return () => subscriber.off('message', handler);
}
