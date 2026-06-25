/** Browser wrapper for GET /api/cache/repo. */
import type { CachedRepoResult } from '@/types/cacheResult';

export async function fetchCachedRepo(name: string): Promise<CachedRepoResult> {
    const response = await fetch(`/api/cache/repo?name=${encodeURIComponent(name)}`);
    if (!response.ok) {
        throw new Error(`Cache request failed: ${response.status}`);
    }
    return response.json();
}
