/** Return shape for getCachedRepo: whether data was served from Redis or fetched live. */
import type { RepoStats } from './repoStats';

export type CacheSource = 'HIT' | 'MISS';

export type CachedRepoResult = {
    source: CacheSource;
    data: RepoStats;
    ttl: number;
};
