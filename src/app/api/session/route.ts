/** Session demo endpoint: POST creates a new session and returns the token. */
import { z } from 'zod';
import { createSession } from '@/services/session/createSession';

const CreateSessionSchema = z.object({
    label: z.string().min(1).max(60),
});

export async function POST(request: Request) {
    const body: unknown = await request.json().catch(() => null);
    const parsed = CreateSessionSchema.safeParse(body);
    if (!parsed.success) {
        return Response.json({ error: 'Invalid body' }, { status: 400 });
    }
    const token = await createSession(parsed.data.label);
    return Response.json({ token });
}
