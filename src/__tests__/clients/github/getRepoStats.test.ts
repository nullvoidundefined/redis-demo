import { afterEach, describe, expect, it, vi } from 'vitest';
import githubRepo from '@/__fixtures__/githubRepo.json';
import { getRepoStats } from '@/clients/github/getRepoStats';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('getRepoStats', () => {
    it('maps the GitHub repo JSON to RepoStats', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: true, json: async () => githubRepo }),
        );
        const stats = await getRepoStats('redis/redis');
        expect(stats).toEqual({
            fullName: 'redis/redis',
            description: 'Redis is an in-memory database that persists on disk.',
            stars: 67000,
            forks: 23800,
            openIssues: 2400,
            language: 'C',
        });
    });

    it('throws on a non-ok response', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
        await expect(getRepoStats('nope/nope')).rejects.toThrow(/404/);
    });
});
