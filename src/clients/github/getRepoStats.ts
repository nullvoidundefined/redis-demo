/** Raw GitHub REST call for public repo stats. No cache knowledge; the cache
 * service wraps this. Sends the optional GITHUB_TOKEN to raise the rate limit. */
import { loadConfig } from '@/config/loadConfig';
import type { RepoStats } from '@/types/repoStats';

const GITHUB_API_BASE = 'https://api.github.com/repos';

type GithubRepoResponse = {
    full_name: string;
    description: string | null;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    language: string | null;
};

export async function getRepoStats(fullName: string): Promise<RepoStats> {
    const { GITHUB_TOKEN } = loadConfig();
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
    if (GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
    }
    const response = await fetch(`${GITHUB_API_BASE}/${fullName}`, { headers });
    if (!response.ok) {
        throw new Error(`GitHub API error ${response.status} for ${fullName}`);
    }
    return toRepoStats(await response.json());
}

function toRepoStats(body: GithubRepoResponse): RepoStats {
    return {
        fullName: body.full_name,
        description: body.description,
        stars: body.stargazers_count,
        forks: body.forks_count,
        openIssues: body.open_issues_count,
        language: body.language,
    };
}
