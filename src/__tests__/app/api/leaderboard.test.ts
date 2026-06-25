import { describe, expect, it, vi } from 'vitest';

const { submitScore } = vi.hoisted(() => ({ submitScore: vi.fn() }));
const { getLeaderboard } = vi.hoisted(() => ({ getLeaderboard: vi.fn() }));
vi.mock('@/services/leaderboard/submitScore', () => ({ submitScore }));
vi.mock('@/services/leaderboard/getLeaderboard', () => ({ getLeaderboard }));

import { GET, POST } from '@/app/api/leaderboard/route';

function postJson(body: unknown) {
    return new Request('http://x/api/leaderboard', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

describe('POST /api/leaderboard', () => {
    it('submits a valid score and returns submitted: true', async () => {
        submitScore.mockResolvedValueOnce(undefined);
        const response = await POST(postJson({ name: 'Alice', score: 500 }));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ submitted: true });
        expect(submitScore).toHaveBeenCalledWith('Alice', 500);
    });

    it('returns 400 for a missing name', async () => {
        const response = await POST(postJson({ score: 500 }));
        expect(response.status).toBe(400);
    });

    it('returns 400 for a non-integer score', async () => {
        const response = await POST(postJson({ name: 'Alice', score: 3.5 }));
        expect(response.status).toBe(400);
    });

    it('returns 400 for an empty name', async () => {
        const response = await POST(postJson({ name: '', score: 100 }));
        expect(response.status).toBe(400);
    });
});

describe('GET /api/leaderboard', () => {
    it('returns the leaderboard entries', async () => {
        const entries = [{ name: 'Alice', score: 500, rank: 1 }];
        getLeaderboard.mockResolvedValueOnce(entries);
        const response = await GET();
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(entries);
    });
});
