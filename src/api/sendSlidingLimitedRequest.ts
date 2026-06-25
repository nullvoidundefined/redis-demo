/** Browser wrapper for POST /api/sliding-limited; returns the HTTP status
 * alongside the parsed body so the UI can show the 429 state. */
import type { RateLimitResult } from '@/types/rateLimit';

export async function sendSlidingLimitedRequest(): Promise<{
    status: number;
    result: RateLimitResult;
}> {
    const response = await fetch('/api/sliding-limited', { method: 'POST' });
    const result = (await response.json()) as RateLimitResult;
    return { status: response.status, result };
}
