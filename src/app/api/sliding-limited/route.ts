/** Sliding-window rate-limited endpoint: keys the limiter on the x-client-id
 * header (or a fallback) and returns 429 with Retry-After once the window
 * budget is spent. */
import { checkSlidingRateLimit } from '@/services/rateLimit/checkSlidingRateLimit';

const DEFAULT_CLIENT_ID = 'anonymous';

export async function POST(request: Request) {
    const clientId = request.headers.get('x-client-id') ?? DEFAULT_CLIENT_ID;
    const result = await checkSlidingRateLimit(clientId);
    if (!result.allowed) {
        return Response.json(result, {
            status: 429,
            headers: { 'Retry-After': String(result.resetIn) },
        });
    }
    return Response.json(result);
}
