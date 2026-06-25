/** Caching demo: fetches GitHub repo stats through the cache and shows HIT/MISS,
 * measured latency, a live TTL countdown, and a cache-clear control. */
'use client';

import { useState } from 'react';
import { clearCachedRepo } from '@/api/clearCachedRepo';
import { fetchCachedRepo } from '@/api/fetchCachedRepo';
import { useCountdown } from '@/state/useCountdown';
import type { CachedRepoResult } from '@/types/cacheResult';
import styles from './CacheDemo.module.scss';

const DEFAULT_REPO = 'redis/redis';

export function CacheDemo() {
    const [name, setName] = useState(DEFAULT_REPO);
    const [result, setResult] = useState<CachedRepoResult | null>(null);
    const [latencyMs, setLatencyMs] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const ttl = useCountdown(result?.ttl ?? 0);

    async function handleFetch() {
        try {
            setErrorMessage(null);
            const start = performance.now();
            const next = await fetchCachedRepo(name);
            setLatencyMs(Math.round(performance.now() - start));
            setResult(next);
        } catch {
            setErrorMessage('Request failed. Is Redis running?');
        }
    }

    async function handleClear() {
        try {
            setErrorMessage(null);
            await clearCachedRepo(name);
            setResult(null);
            setLatencyMs(null);
        } catch {
            setErrorMessage('Request failed. Is Redis running?');
        }
    }

    return (
        <div className={styles.panel}>
            <div className={styles.row}>
                <label htmlFor="repo">Repo</label>
                <input id="repo" value={name} onChange={(event) => setName(event.target.value)} />
                <button onClick={handleFetch}>Fetch</button>
                <button onClick={handleClear}>Clear cache</button>
            </div>
            {errorMessage && (
                <p role="alert" className={styles.error}>
                    {errorMessage}
                </p>
            )}
            {result && (
                <div>
                    <p className={result.source === 'HIT' ? styles.hit : styles.miss}>
                        {result.source} - {latencyMs}ms - TTL {ttl}s
                    </p>
                    <p>{result.data.fullName}</p>
                    <p>stars: {result.data.stars}</p>
                </div>
            )}
        </div>
    );
}
