import { describe, expect, it, vi } from 'vitest';

const { createSession } = vi.hoisted(() => ({ createSession: vi.fn() }));
const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
const { destroySession } = vi.hoisted(() => ({ destroySession: vi.fn() }));
vi.mock('@/services/session/createSession', () => ({ createSession }));
vi.mock('@/services/session/getSession', () => ({ getSession }));
vi.mock('@/services/session/destroySession', () => ({ destroySession }));

import { POST } from '@/app/api/session/route';
import { DELETE, GET } from '@/app/api/session/[token]/route';

function postJson(body: unknown) {
    return new Request('http://x/api/session', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

describe('POST /api/session', () => {
    it('creates a session and returns the token', async () => {
        createSession.mockResolvedValueOnce('tok-abc');
        const response = await POST(postJson({ label: 'my-session' }));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ token: 'tok-abc' });
    });

    it('returns 400 for an empty label', async () => {
        const response = await POST(postJson({ label: '' }));
        expect(response.status).toBe(400);
    });

    it('returns 400 for a missing label', async () => {
        const response = await POST(postJson({}));
        expect(response.status).toBe(400);
    });
});

describe('GET /api/session/:token', () => {
    it('returns 200 with the session view when found', async () => {
        const sessionView = {
            token: 'tok-abc',
            data: { label: 'my-session', createdAt: '2024-01-01T00:00:00.000Z' },
            ttl: 1799,
        };
        getSession.mockResolvedValueOnce(sessionView);
        const response = await GET(new Request('http://x/api/session/tok-abc'), {
            params: Promise.resolve({ token: 'tok-abc' }),
        });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(sessionView);
    });

    it('returns 404 when the session is not found', async () => {
        getSession.mockResolvedValueOnce(null);
        const response = await GET(new Request('http://x/api/session/missing'), {
            params: Promise.resolve({ token: 'missing' }),
        });
        expect(response.status).toBe(404);
    });
});

describe('DELETE /api/session/:token', () => {
    it('destroys the session and returns destroyed: true', async () => {
        destroySession.mockResolvedValueOnce(undefined);
        const response = await DELETE(new Request('http://x/api/session/tok-abc'), {
            params: Promise.resolve({ token: 'tok-abc' }),
        });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ destroyed: true });
    });
});
