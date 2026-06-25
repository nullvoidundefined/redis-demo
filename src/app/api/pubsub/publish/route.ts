/** Publishes a message to the pub/sub demo channel. */
import { z } from 'zod';
import { publishMessage } from '@/services/pubsub/publishMessage';

const PublishSchema = z.object({ message: z.string().min(1).max(280) });

export async function POST(request: Request) {
    const body: unknown = await request.json().catch(() => null);
    const parsed = PublishSchema.safeParse(body);
    if (!parsed.success) {
        return Response.json({ error: 'Invalid body' }, { status: 400 });
    }
    await publishMessage(parsed.data.message);
    return Response.json({ published: true });
}
