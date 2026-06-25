/** SSE stream of pub/sub channel messages. Subscribes on connect, streams each
 * message as an SSE frame, and unsubscribes when the client disconnects. */
import { subscribeToChannel } from '@/services/pubsub/subscribeToChannel';
import { encodeSseEvent } from '@/services/sse/encodeSseEvent';

export const dynamic = 'force-dynamic';

export async function GET() {
    const encoder = new TextEncoder();
    let unsubscribe: () => void = () => {};
    const stream = new ReadableStream({
        async start(controller) {
            unsubscribe = await subscribeToChannel((message) => {
                try {
                    controller.enqueue(encoder.encode(encodeSseEvent({ message })));
                } catch {
                    // Controller already closed (client disconnected); detach so this
                    // stale handler stops firing.
                    unsubscribe();
                }
            });
        },
        cancel() {
            unsubscribe();
        },
    });
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
}
