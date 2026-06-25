import { describe, expect, it, vi } from 'vitest';

const { checkSlidingRateLimit } = vi.hoisted(() => ({ checkSlidingRateLimit: vi.fn() }));
vi.mock('@/services/rateLimit/checkSlidingRateLimit', () => ({ checkSlidingRateLimit }));

import { POST } from '@/app/api/sliding-limited/route';

describe('POST /api/sliding-limited', () => {
    it('returns 200 with the result when allowed', async () => {
        checkSlidingRateLimit.mockResolvedValueOnce({ allowed: true, remaining: 4, resetIn: 8 });
        const response = await POST(
            new Request('http://x/api/sliding-limited', { method: 'POST' }),
        );
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ allowed: true, remaining: 4, resetIn: 8 });
    });

    it('returns 429 with Retry-After when blocked', async () => {
        checkSlidingRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetIn: 7 });
        const response = await POST(
            new Request('http://x/api/sliding-limited', { method: 'POST' }),
        );
        expect(response.status).toBe(429);
        expect(response.headers.get('Retry-After')).toBe('7');
    });
});
