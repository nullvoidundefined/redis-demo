/** Session demo endpoints: GET reads a session by token, DELETE destroys it. */
import { destroySession } from '@/services/session/destroySession';
import { getSession } from '@/services/session/getSession';

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
    const { token } = await context.params;
    const sessionView = await getSession(token);
    if (!sessionView) {
        return Response.json({ error: 'Not found' }, { status: 404 });
    }
    return Response.json(sessionView);
}

export async function DELETE(_request: Request, context: { params: Promise<{ token: string }> }) {
    const { token } = await context.params;
    await destroySession(token);
    return Response.json({ destroyed: true });
}
