import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/cache/getCachedRepo', () => ({
    getCachedRepo: vi.fn().mockResolvedValue({ source: 'HIT', data: { fullName: 'a/b' }, ttl: 42 }),
}));
vi.mock('@/services/cache/invalidateCachedRepo', () => ({
    invalidateCachedRepo: vi.fn().mockResolvedValue(undefined),
}));

import { DELETE, GET } from '@/app/api/cache/repo/route';

describe('GET /api/cache/repo', () => {
    it('returns the cached result for a valid name', async () => {
        const response = await GET(new Request('http://x/api/cache/repo?name=a/b'));
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ source: 'HIT', ttl: 42 });
    });

    it('returns 400 when name is missing', async () => {
        const response = await GET(new Request('http://x/api/cache/repo'));
        expect(response.status).toBe(400);
    });
});

describe('DELETE /api/cache/repo', () => {
    it('clears and returns 200', async () => {
        const response = await DELETE(new Request('http://x/api/cache/repo?name=a/b'));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ cleared: true });
    });
});
