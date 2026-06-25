/** Queue demo endpoints: POST enqueues a job, GET lists recent jobs. */
import { z } from 'zod';
import { enqueueJob } from '@/services/queue/enqueueJob';
import { listJobs } from '@/services/queue/listJobs';

const EnqueueSchema = z.object({
    type: z.enum(['normal', 'flaky']),
    label: z.string().min(1).max(100),
});

export async function POST(request: Request) {
    const body: unknown = await request.json().catch(() => null);
    const parsed = EnqueueSchema.safeParse(body);
    if (!parsed.success) {
        return Response.json({ error: 'Invalid body' }, { status: 400 });
    }
    const jobId = await enqueueJob(parsed.data.type, parsed.data.label);
    return Response.json({ jobId });
}

export async function GET() {
    return Response.json(await listJobs());
}
