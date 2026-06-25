/** Rate-limited endpoint: keys the limiter on the x-client-id header (or a
 * fallback) and returns 429 with Retry-After once the window budget is spent. */
import { checkRateLimit } from '@/services/rateLimit/checkRateLimit';

const DEFAULT_CLIENT_ID = 'anonymous';

export async function POST(request: Request) {
    const clientId = request.headers.get('x-client-id') ?? DEFAULT_CLIENT_ID;
    const result = await checkRateLimit(clientId);
    if (!result.allowed) {
        return Response.json(result, {
            status: 429,
            headers: { 'Retry-After': String(result.resetIn) },
        });
    }
    return Response.json(result);
}
