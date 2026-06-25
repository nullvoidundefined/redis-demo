/** Returns a single job's current lifecycle state. */
import { getJobState } from '@/services/queue/getJobState';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const job = await getJobState(id);
    if (!job) {
        return Response.json({ error: 'Not found' }, { status: 404 });
    }
    return Response.json(job);
}
