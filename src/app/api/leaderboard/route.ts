/** Leaderboard endpoints: POST submits a score, GET returns the top-N entries. */
import { z } from 'zod';
import { getLeaderboard } from '@/services/leaderboard/getLeaderboard';
import { submitScore } from '@/services/leaderboard/submitScore';

const SubmitScoreSchema = z.object({
    name: z.string().min(1).max(40),
    score: z.number().int(),
});

export async function POST(request: Request) {
    const body: unknown = await request.json().catch(() => null);
    const parsed = SubmitScoreSchema.safeParse(body);
    if (!parsed.success) {
        return Response.json({ error: 'Invalid body' }, { status: 400 });
    }
    await submitScore(parsed.data.name, parsed.data.score);
    return Response.json({ submitted: true });
}

export async function GET() {
    return Response.json(await getLeaderboard());
}
