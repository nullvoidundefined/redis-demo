import { describe, expect, it, vi } from 'vitest';

const { checkRateLimit } = vi.hoisted(() => ({ checkRateLimit: vi.fn() }));
vi.mock('@/services/rateLimit/checkRateLimit', () => ({ checkRateLimit }));

import { POST } from '@/app/api/limited/route';

describe('POST /api/limited', () => {
    it('returns 200 with the result when allowed', async () => {
        checkRateLimit.mockResolvedValueOnce({ allowed: true, remaining: 4, resetIn: 8 });
        const response = await POST(new Request('http://x/api/limited', { method: 'POST' }));
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ remaining: 4 });
    });

    it('returns 429 with Retry-After when blocked', async () => {
        checkRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetIn: 7 });
        const response = await POST(new Request('http://x/api/limited', { method: 'POST' }));
        expect(response.status).toBe(429);
        expect(response.headers.get('Retry-After')).toBe('7');
    });
});
