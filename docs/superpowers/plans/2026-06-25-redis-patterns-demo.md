# Redis Patterns Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an educational Next.js MVP that demonstrates four production Redis patterns (cache-aside caching, fixed-window rate limiting, a BullMQ job queue with a separate worker, and pub/sub over SSE) against a local Docker Redis.

**Architecture:** One Next.js 16 App Router app. Thin route handlers and a standalone worker call a `services/` layer; `services/` calls `clients/` (raw `ioredis` connections and the GitHub REST API). Redis connections are split into a normal client, a dedicated subscriber, and per-queue BullMQ connections. Integration tests run against a real test Redis.

**Tech Stack:** Next.js 16, React 19, TypeScript, SCSS modules, Radix UI, `ioredis`, `bullmq`, Zod, Vitest, Playwright (config only), Docker Compose (`redis:7`).

## Global Constraints

- Source spec: `docs/superpowers/specs/2026-06-25-redis-patterns-demo-design.md`.
- Node engine `24.x`; `package.json` `"type": "module"`.
- Prettier: 4-space indent, 100 print width, single quotes, trailing commas; config file uses `.mjs` extension.
- One exported function per file across `services/`, `api/`, `clients/` (R-235). Shared constants/types live in `constants/` and `types/`, never in a function's file (R-222).
- File-level header comment on every new non-test source file (R-230).
- No magic strings/numbers; extract to named constants (R-219).
- Tests must fail when behavior is wrong; no self-mocks, no tautologies; behavior assertions over call-count assertions (R-200). One negative-input test per write handler (R-208).
- Integration tests hit a real Redis (never a mocked Redis client), isolate by key prefix, and clean up their prefix in teardown — never `FLUSHALL`.
- Constants (verbatim): `CACHE_TTL_SECONDS = 60`, `CACHE_KEY_PREFIX = 'cache:repo:'`, `WINDOW_SECONDS = 10`, `MAX_REQUESTS = 10`, `RATE_LIMIT_KEY_PREFIX = 'ratelimit:'`, `QUEUE_NAME = 'demo-jobs'`, `JOB_NAME = 'process'`, `JOB_ATTEMPTS = 3`, `BACKOFF_DELAY_MS = 1000`, `RESULT_KEY_PREFIX = 'job:result:'`, `RESULT_TTL_SECONDS = 300`, `CHANNEL = 'demo-events'`, default `WORKER_PORT = 3002`.
- Ports: web 3000, worker health 3002.

---

### Task 1: Project scaffold, tooling, env config, landing page

**Files:**

- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `prettier.config.mjs`, `eslint.config.mjs`, `.prettierignore`, `.gitignore`, `vitest.config.ts`, `next-env.d.ts`, `docker-compose.yml`, `.env.example`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.scss`
- Create: `src/components/Nav/Nav.tsx`, `src/components/Nav/Nav.module.scss`
- Create: `src/config/loadConfig.ts`
- Create: `src/constants/cache.ts`, `src/constants/rateLimit.ts`, `src/constants/queue.ts`, `src/constants/pubsub.ts`, `src/constants/ports.ts`
- Create: `src/__tests__/setup.ts`, `src/__tests__/config/loadConfig.test.ts`

**Interfaces:**

- Produces: `loadConfig(env?: NodeJS.ProcessEnv): { REDIS_URL: string; GITHUB_TOKEN?: string; WORKER_PORT: number }` — throws `Error` when `REDIS_URL` is missing/empty.
- Produces all Global-Constraints constants from `src/constants/*`.

- [ ] **Step 1: Initialize the repo and copy verbatim-ported tooling from chat-demo**

```bash
cd /Users/iangreenough/Desktop/code/personal/development/redis-demo
git init
CHAT=/Users/iangreenough/Desktop/code/personal/development/chat-demo
cp "$CHAT/prettier.config.mjs" prettier.config.mjs
cp "$CHAT/eslint.config.mjs" eslint.config.mjs
cp "$CHAT/tsconfig.json" tsconfig.json
cp "$CHAT/next.config.ts" next.config.ts
cp "$CHAT/next-env.d.ts" next-env.d.ts
cp "$CHAT/vitest.config.ts" vitest.config.ts
cp "$CHAT/src/__tests__/setup.ts" src/__tests__/setup.ts 2>/dev/null || mkdir -p src/__tests__ && cp "$CHAT/src/__tests__/setup.ts" src/__tests__/setup.ts
```

- [ ] **Step 2: Adapt `.gitignore` and `.prettierignore` (drop the chat-demo `evals/` entries)**

`.gitignore`:

```
node_modules/
.next/
out/
build/
.env
.env.local
*.log
*.tsbuildinfo
next-env.d.ts
.superpowers/
playwright-report/
test-results/
/blob-report/
```

`.prettierignore`:

```
package-lock.json
.next/
node_modules/
# Next.js rewrites tsconfig.json on every build (its own 2-space format); it owns this file.
tsconfig.json
playwright-report/
test-results/
/blob-report/
```

- [ ] **Step 3: Write `package.json`**

```json
{
    "name": "redis-demo",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "engines": { "node": "24.x" },
    "scripts": {
        "dev": "next dev -p 3000",
        "build": "next build",
        "start": "next start -p 3000",
        "worker": "node --env-file-if-exists=.env --import tsx worker.ts",
        "lint": "eslint .",
        "format": "prettier --write .",
        "format:check": "prettier --check .",
        "test": "vitest run",
        "test:watch": "vitest",
        "test:e2e": "playwright test"
    },
    "dependencies": {
        "@radix-ui/react-scroll-area": "^1.2.0",
        "bullmq": "^5.34.0",
        "ioredis": "^5.4.0",
        "next": "^16.0.0",
        "react": "^19.0.0",
        "react-dom": "^19.0.0",
        "zod": "^3.24.0"
    },
    "devDependencies": {
        "@axe-core/playwright": "^4.11.3",
        "@eslint/eslintrc": "^3.0.0",
        "@playwright/test": "^1.61.0",
        "@testing-library/jest-dom": "^6.6.0",
        "@testing-library/react": "^16.1.0",
        "@types/node": "^24.0.0",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        "@typescript-eslint/parser": "^8.0.0",
        "@vitejs/plugin-react": "^4.7.0",
        "eslint": "^9.0.0",
        "eslint-config-next": "^16.0.0",
        "eslint-config-prettier": "^10.0.0",
        "eslint-plugin-jsx-a11y": "^6.10.0",
        "eslint-plugin-react": "^7.37.0",
        "eslint-plugin-react-hooks": "^5.0.0",
        "eslint-plugin-security": "^3.0.0",
        "eslint-plugin-unused-imports": "^4.0.0",
        "globals": "^16.0.0",
        "jsdom": "^25.0.0",
        "prettier": "^3.8.0",
        "sass": "^1.80.0",
        "tsx": "^4.19.0",
        "typescript": "^5.7.0",
        "typescript-eslint": "^8.0.0"
    }
}
```

Then run `npm install`.

- [ ] **Step 4: Write `docker-compose.yml` and `.env.example`**

`docker-compose.yml`:

```yaml
services:
    redis:
        image: redis:7
        ports:
            - '6379:6379'
        volumes:
            - redis-data:/data
volumes:
    redis-data:
```

`.env.example`:

```
REDIS_URL=redis://localhost:6379
GITHUB_TOKEN=
WORKER_PORT=3002
```

- [ ] **Step 5: Write the constants modules**

`src/constants/cache.ts`:

```ts
/** Cache-aside demo tuning: TTL and the Redis key namespace. */
export const CACHE_TTL_SECONDS = 60;
export const CACHE_KEY_PREFIX = 'cache:repo:';
```

`src/constants/rateLimit.ts`:

```ts
/** Fixed-window rate limiter tuning and key namespace. */
export const WINDOW_SECONDS = 10;
export const MAX_REQUESTS = 10;
export const RATE_LIMIT_KEY_PREFIX = 'ratelimit:';
```

`src/constants/queue.ts`:

```ts
/** BullMQ queue identifiers, retry policy, and result-record namespace. */
export const QUEUE_NAME = 'demo-jobs';
export const JOB_NAME = 'process';
export const JOB_ATTEMPTS = 3;
export const BACKOFF_DELAY_MS = 1000;
export const RESULT_KEY_PREFIX = 'job:result:';
export const RESULT_TTL_SECONDS = 300;
```

`src/constants/pubsub.ts`:

```ts
/** Pub/sub demo channel name. */
export const CHANNEL = 'demo-events';
```

`src/constants/ports.ts`:

```ts
/** Worker health-check port; overridable via WORKER_PORT. */
export const WORKER_PORT = Number(process.env.WORKER_PORT ?? 3002);
```

- [ ] **Step 6: Write the failing test for `loadConfig`**

`src/__tests__/config/loadConfig.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { loadConfig } from '@/config/loadConfig';

describe('loadConfig', () => {
    it('returns parsed config when REDIS_URL is present', () => {
        const config = loadConfig({ REDIS_URL: 'redis://localhost:6379', WORKER_PORT: '3002' });
        expect(config.REDIS_URL).toBe('redis://localhost:6379');
        expect(config.WORKER_PORT).toBe(3002);
    });

    it('defaults WORKER_PORT to 3002 when unset', () => {
        const config = loadConfig({ REDIS_URL: 'redis://localhost:6379' });
        expect(config.WORKER_PORT).toBe(3002);
    });

    it('throws a clear error when REDIS_URL is missing', () => {
        expect(() => loadConfig({})).toThrow(/REDIS_URL/);
    });
});
```

- [ ] **Step 7: Run the test, verify it fails**

Run: `npx vitest run src/__tests__/config/loadConfig.test.ts`
Expected: FAIL (`Cannot find module '@/config/loadConfig'`).

- [ ] **Step 8: Implement `loadConfig`**

`src/config/loadConfig.ts`:

```ts
/** Loads and validates process environment. Fails fast with a clear message
 * when REDIS_URL is absent, so misconfiguration surfaces at boot, not mid-request. */
import { z } from 'zod';

const EnvSchema = z.object({
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
    GITHUB_TOKEN: z.string().optional(),
    WORKER_PORT: z.coerce.number().default(3002),
});

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
    const parsed = EnvSchema.safeParse(env);
    if (!parsed.success) {
        const message = parsed.error.issues.map((issue) => issue.message).join(', ');
        throw new Error(`Invalid environment: ${message}`);
    }
    return parsed.data;
}
```

- [ ] **Step 9: Run the test, verify it passes**

Run: `npx vitest run src/__tests__/config/loadConfig.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 10: Write the shared layout, nav, landing page, and styles**

`src/app/globals.scss`:

```scss
:root {
    --bg: #0b0e14;
    --panel: #151a23;
    --text: #e6e6e6;
    --accent: #5aa9e6;
    --hit: #4caf50;
    --miss: #e0a458;
    --error: #e05a5a;
}

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: system-ui, sans-serif;
}

@media (prefers-reduced-motion: reduce) {
    * {
        animation: none !important;
        transition: none !important;
    }
}
```

`src/components/Nav/Nav.module.scss`:

```scss
.nav {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: var(--panel);
}

.link {
    color: var(--accent);
    text-decoration: none;

    &:hover {
        text-decoration: underline;
    }
}
```

`src/components/Nav/Nav.tsx`:

```tsx
/** Primary navigation across the four Redis pattern demos. */
import Link from 'next/link';
import styles from './Nav.module.scss';

const LINKS = [
    { href: '/', label: 'Home' },
    { href: '/caching', label: 'Caching' },
    { href: '/rate-limit', label: 'Rate Limit' },
    { href: '/queue', label: 'Queue' },
    { href: '/pubsub', label: 'Pub/Sub' },
];

export function Nav() {
    return (
        <nav className={styles.nav}>
            {LINKS.map((link) => (
                <Link key={link.href} href={link.href} className={styles.link}>
                    {link.label}
                </Link>
            ))}
        </nav>
    );
}
```

`src/app/layout.tsx`:

```tsx
/** Root layout: global styles plus the shared demo navigation. */
import type { ReactNode } from 'react';
import { Nav } from '@/components/Nav/Nav';
import './globals.scss';

export const metadata = { title: 'Redis Patterns Demo' };

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <body>
                <Nav />
                <main style={{ padding: '1.5rem' }}>{children}</main>
            </body>
        </html>
    );
}
```

`src/app/page.tsx`:

```tsx
/** Landing page: explains the four Redis patterns demonstrated by this app. */
export default function HomePage() {
    return (
        <section>
            <h1>Redis Patterns Demo</h1>
            <p>Four common production uses of Redis, each on its own page:</p>
            <ul>
                <li>
                    <strong>Caching</strong> — cache-aside over the GitHub API with TTL and
                    invalidation.
                </li>
                <li>
                    <strong>Rate limiting</strong> — fixed-window limiter with INCR + EXPIRE.
                </li>
                <li>
                    <strong>Queue</strong> — BullMQ jobs processed by a separate worker, with
                    retries and backoff.
                </li>
                <li>
                    <strong>Pub/Sub</strong> — live messages streamed to the browser over SSE.
                </li>
            </ul>
        </section>
    );
}
```

- [ ] **Step 11: Verify tooling passes end to end**

Run: `npx tsc --noEmit && npm run lint && npm run format:check && npm run build`
Expected: all succeed. If `format:check` fails, run `npm run format` and re-check.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: scaffold redis-demo with tooling, config, and landing page"
```

---

### Task 2: Redis connection clients

**Files:**

- Create: `src/clients/redis/createRedisClient.ts`, `src/clients/redis/getRedisClient.ts`, `src/clients/redis/getRedisSubscriber.ts`, `src/clients/redis/disconnectRedis.ts`
- Test: `src/__tests__/integration/redisClient.test.ts`

**Interfaces:**

- Consumes: `loadConfig` (Task 1).
- Produces: `createRedisClient(options?: RedisOptions): Redis`; `getRedisClient(): Redis` (shared singleton for normal commands); `getRedisSubscriber(): Redis` (dedicated subscribe-only connection); `disconnectRedis(): Promise<void>`.

- [ ] **Step 1: Write the failing integration test (requires Redis: `docker compose up -d`)**

`src/__tests__/integration/redisClient.test.ts`:

```ts
// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest';
import { createRedisClient } from '@/clients/redis/createRedisClient';

const client = createRedisClient();

afterAll(async () => {
    await client.quit();
});

describe('redis client (integration)', () => {
    it('connects and responds to PING', async () => {
        expect(await client.ping()).toBe('PONG');
    });

    it('round-trips a value', async () => {
        const key = `test:redisClient:${process.pid}`;
        await client.set(key, 'hello');
        expect(await client.get(key)).toBe('hello');
        await client.del(key);
    });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run src/__tests__/integration/redisClient.test.ts`
Expected: FAIL (`Cannot find module '@/clients/redis/createRedisClient'`).

- [ ] **Step 3: Implement the four connection modules**

`src/clients/redis/createRedisClient.ts`:

```ts
/** Factory for ioredis connections built from REDIS_URL. Callers pass options
 * (BullMQ requires maxRetriesPerRequest: null on its connections). */
import Redis, { type RedisOptions } from 'ioredis';
import { loadConfig } from '@/config/loadConfig';

export function createRedisClient(options: RedisOptions = {}): Redis {
    const { REDIS_URL } = loadConfig();
    return new Redis(REDIS_URL, options);
}
```

`src/clients/redis/getRedisClient.ts`:

```ts
/** Shared singleton connection for normal Redis commands (cache, rate limit,
 * queue producer). A subscribed connection cannot run these, so pub/sub uses a
 * separate connection (getRedisSubscriber). */
import type Redis from 'ioredis';
import { createRedisClient } from './createRedisClient';

let client: Redis | undefined;

export function getRedisClient(): Redis {
    if (!client) {
        client = createRedisClient();
    }
    return client;
}
```

`src/clients/redis/getRedisSubscriber.ts`:

```ts
/** Dedicated connection used only for pub/sub subscribe. Kept separate because a
 * connection in subscriber mode rejects ordinary commands. */
import type Redis from 'ioredis';
import { createRedisClient } from './createRedisClient';

let subscriber: Redis | undefined;

export function getRedisSubscriber(): Redis {
    if (!subscriber) {
        subscriber = createRedisClient();
    }
    return subscriber;
}
```

`src/clients/redis/disconnectRedis.ts`:

```ts
/** Graceful shutdown of the shared connections (used by the worker and tests). */
import { getRedisClient } from './getRedisClient';
import { getRedisSubscriber } from './getRedisSubscriber';

export async function disconnectRedis(): Promise<void> {
    await Promise.all([getRedisClient().quit(), getRedisSubscriber().quit()]);
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx vitest run src/__tests__/integration/redisClient.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add ioredis connection clients (normal, subscriber, disconnect)"
```

---

### Task 3: GitHub client + cache service

**Files:**

- Create: `src/types/repoStats.ts`, `src/types/cacheResult.ts`
- Create: `src/clients/github/getRepoStats.ts`
- Create: `src/services/cache/getCachedRepo.ts`, `src/services/cache/invalidateCachedRepo.ts`
- Test: `src/__tests__/clients/github/getRepoStats.test.ts`, `src/__tests__/integration/cacheService.test.ts`
- Create fixture: `src/__fixtures__/githubRepo.json`

**Interfaces:**

- Consumes: `getRedisClient` (Task 2), `loadConfig` (Task 1), `CACHE_TTL_SECONDS`, `CACHE_KEY_PREFIX` (Task 1).
- Produces: `RepoStats = { fullName: string; description: string | null; stars: number; forks: number; openIssues: number; language: string | null }`; `CachedRepoResult = { source: 'HIT' | 'MISS'; data: RepoStats; ttl: number }`; `getRepoStats(fullName: string): Promise<RepoStats>`; `getCachedRepo(fullName: string): Promise<CachedRepoResult>`; `invalidateCachedRepo(fullName: string): Promise<void>`.

- [ ] **Step 1: Write the types and the fixture**

`src/types/repoStats.ts`:

```ts
export type RepoStats = {
    fullName: string;
    description: string | null;
    stars: number;
    forks: number;
    openIssues: number;
    language: string | null;
};
```

`src/types/cacheResult.ts`:

```ts
import type { RepoStats } from './repoStats';

export type CacheSource = 'HIT' | 'MISS';

export type CachedRepoResult = {
    source: CacheSource;
    data: RepoStats;
    ttl: number;
};
```

`src/__fixtures__/githubRepo.json` (trimmed real shape from `https://api.github.com/repos/redis/redis`):

```json
{
    "full_name": "redis/redis",
    "description": "Redis is an in-memory database that persists on disk.",
    "stargazers_count": 67000,
    "forks_count": 23800,
    "open_issues_count": 2400,
    "language": "C"
}
```

- [ ] **Step 2: Write the failing test for `getRepoStats`**

`src/__tests__/clients/github/getRepoStats.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the test, verify it fails**

Run: `npx vitest run src/__tests__/clients/github/getRepoStats.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `getRepoStats`**

`src/clients/github/getRepoStats.ts`:

```ts
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
```

- [ ] **Step 5: Run the test, verify it passes**

Run: `npx vitest run src/__tests__/clients/github/getRepoStats.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Write the failing integration test for the cache service**

`src/__tests__/integration/cacheService.test.ts`:

```ts
// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { CACHE_KEY_PREFIX } from '@/constants/cache';

const FULL_NAME = 'redis/redis';
const STATS = {
    fullName: FULL_NAME,
    description: 'desc',
    stars: 1,
    forks: 2,
    openIssues: 3,
    language: 'C',
};

vi.mock('@/clients/github/getRepoStats', () => ({
    getRepoStats: vi.fn().mockResolvedValue(STATS),
}));

import { getRepoStats } from '@/clients/github/getRepoStats';
import { getCachedRepo } from '@/services/cache/getCachedRepo';
import { invalidateCachedRepo } from '@/services/cache/invalidateCachedRepo';

beforeEach(async () => {
    vi.clearAllMocks();
    await getRedisClient().del(`${CACHE_KEY_PREFIX}${FULL_NAME}`);
});

afterAll(async () => {
    await getRedisClient().del(`${CACHE_KEY_PREFIX}${FULL_NAME}`);
    await getRedisClient().quit();
});

describe('getCachedRepo (integration)', () => {
    it('MISS then HIT: second call serves from cache without re-fetching', async () => {
        const first = await getCachedRepo(FULL_NAME);
        expect(first.source).toBe('MISS');
        expect(first.data).toEqual(STATS);

        const second = await getCachedRepo(FULL_NAME);
        expect(second.source).toBe('HIT');
        expect(second.data).toEqual(STATS);
        expect(getRepoStats).toHaveBeenCalledTimes(1);
    });

    it('invalidate forces the next call to MISS again', async () => {
        await getCachedRepo(FULL_NAME);
        await invalidateCachedRepo(FULL_NAME);
        const after = await getCachedRepo(FULL_NAME);
        expect(after.source).toBe('MISS');
        expect(getRepoStats).toHaveBeenCalledTimes(2);
    });
});
```

- [ ] **Step 7: Run the test, verify it fails**

Run: `npx vitest run src/__tests__/integration/cacheService.test.ts`
Expected: FAIL (cache service modules not found).

- [ ] **Step 8: Implement the cache service**

`src/services/cache/getCachedRepo.ts`:

```ts
/** Cache-aside read for GitHub repo stats: serve from Redis on HIT, otherwise
 * fetch the slow source and populate the key with a TTL. */
import { getRepoStats } from '@/clients/github/getRepoStats';
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { CACHE_KEY_PREFIX, CACHE_TTL_SECONDS } from '@/constants/cache';
import type { CachedRepoResult } from '@/types/cacheResult';

export async function getCachedRepo(fullName: string): Promise<CachedRepoResult> {
    const redis = getRedisClient();
    const key = `${CACHE_KEY_PREFIX}${fullName}`;
    const cached = await redis.get(key);
    if (cached) {
        const ttl = await redis.ttl(key);
        return { source: 'HIT', data: JSON.parse(cached), ttl };
    }
    const data = await getRepoStats(fullName);
    await redis.set(key, JSON.stringify(data), 'EX', CACHE_TTL_SECONDS);
    return { source: 'MISS', data, ttl: CACHE_TTL_SECONDS };
}
```

`src/services/cache/invalidateCachedRepo.ts`:

```ts
/** Removes a cached repo entry so the next read re-fetches the source. */
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { CACHE_KEY_PREFIX } from '@/constants/cache';

export async function invalidateCachedRepo(fullName: string): Promise<void> {
    await getRedisClient().del(`${CACHE_KEY_PREFIX}${fullName}`);
}
```

- [ ] **Step 9: Run the test, verify it passes**

Run: `npx vitest run src/__tests__/integration/cacheService.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add GitHub client and cache-aside service"
```

---

### Task 4: Cache route handlers + browser wrapper + caching UI

**Files:**

- Create: `src/app/api/cache/repo/route.ts`
- Create: `src/api/fetchCachedRepo.ts`, `src/api/clearCachedRepo.ts`
- Create: `src/state/useCountdown.ts`
- Create: `src/app/caching/page.tsx`, `src/components/CacheDemo/CacheDemo.tsx`, `src/components/CacheDemo/CacheDemo.module.scss`
- Test: `src/__tests__/app/api/cache/repo.test.ts`, `src/__tests__/state/useCountdown.test.ts`, `src/__tests__/components/CacheDemo.test.tsx`

**Interfaces:**

- Consumes: `getCachedRepo`, `invalidateCachedRepo` (Task 3), `CachedRepoResult` (Task 3).
- Produces: `GET /api/cache/repo?name=` -> `CachedRepoResult`; `DELETE /api/cache/repo?name=` -> `{ cleared: true }`; `fetchCachedRepo(name: string): Promise<CachedRepoResult>`; `clearCachedRepo(name: string): Promise<void>`; `useCountdown(seconds: number): number`.

- [ ] **Step 1: Write the failing route test**

`src/__tests__/app/api/cache/repo.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run src/__tests__/app/api/cache/repo.test.ts`
Expected: FAIL (route not found).

- [ ] **Step 3: Implement the route handler**

`src/app/api/cache/repo/route.ts`:

```ts
/** Cache demo endpoint: GET reads through the cache, DELETE invalidates it. */
import { getCachedRepo } from '@/services/cache/getCachedRepo';
import { invalidateCachedRepo } from '@/services/cache/invalidateCachedRepo';

function readName(request: Request): string | null {
    return new URL(request.url).searchParams.get('name');
}

export async function GET(request: Request) {
    const name = readName(request);
    if (!name) {
        return Response.json({ error: 'name is required' }, { status: 400 });
    }
    return Response.json(await getCachedRepo(name));
}

export async function DELETE(request: Request) {
    const name = readName(request);
    if (!name) {
        return Response.json({ error: 'name is required' }, { status: 400 });
    }
    await invalidateCachedRepo(name);
    return Response.json({ cleared: true });
}
```

- [ ] **Step 4: Run the route test, verify it passes**

Run: `npx vitest run src/__tests__/app/api/cache/repo.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing `useCountdown` test**

`src/__tests__/state/useCountdown.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCountdown } from '@/state/useCountdown';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useCountdown', () => {
    it('counts down to zero one second at a time', () => {
        const { result } = renderHook(() => useCountdown(3));
        expect(result.current).toBe(3);
        act(() => void vi.advanceTimersByTime(2000));
        expect(result.current).toBe(1);
        act(() => void vi.advanceTimersByTime(5000));
        expect(result.current).toBe(0);
    });
});
```

- [ ] **Step 6: Run it, verify it fails, then implement `useCountdown`**

Run: `npx vitest run src/__tests__/state/useCountdown.test.ts` (Expected: FAIL, module not found).

`src/state/useCountdown.ts`:

```ts
/** Ticks a second-by-second countdown from a starting value, resetting whenever
 * the input changes. Used for cache TTL and rate-limit reset displays. */
import { useEffect, useState } from 'react';

export function useCountdown(seconds: number): number {
    const [remaining, setRemaining] = useState(seconds);

    useEffect(() => {
        setRemaining(seconds);
        if (seconds <= 0) {
            return;
        }
        const interval = setInterval(() => {
            setRemaining((current) => (current <= 1 ? 0 : current - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [seconds]);

    return remaining;
}
```

Run again: `npx vitest run src/__tests__/state/useCountdown.test.ts` (Expected: PASS).

- [ ] **Step 7: Implement the browser API wrappers**

`src/api/fetchCachedRepo.ts`:

```ts
/** Browser wrapper for GET /api/cache/repo. */
import type { CachedRepoResult } from '@/types/cacheResult';

export async function fetchCachedRepo(name: string): Promise<CachedRepoResult> {
    const response = await fetch(`/api/cache/repo?name=${encodeURIComponent(name)}`);
    if (!response.ok) {
        throw new Error(`Cache request failed: ${response.status}`);
    }
    return response.json();
}
```

`src/api/clearCachedRepo.ts`:

```ts
/** Browser wrapper for DELETE /api/cache/repo. */
export async function clearCachedRepo(name: string): Promise<void> {
    const response = await fetch(`/api/cache/repo?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error(`Cache clear failed: ${response.status}`);
    }
}
```

- [ ] **Step 8: Write the failing `CacheDemo` component test**

`src/__tests__/components/CacheDemo.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/api/fetchCachedRepo', () => ({
    fetchCachedRepo: vi.fn().mockResolvedValue({
        source: 'MISS',
        data: { fullName: 'redis/redis', stars: 5 },
        ttl: 60,
    }),
}));
vi.mock('@/api/clearCachedRepo', () => ({ clearCachedRepo: vi.fn().mockResolvedValue(undefined) }));

import { CacheDemo } from '@/components/CacheDemo/CacheDemo';

describe('CacheDemo', () => {
    it('fetches and shows the HIT/MISS source and repo data', async () => {
        render(<CacheDemo />);
        fireEvent.click(screen.getByRole('button', { name: /fetch/i }));
        await waitFor(() => expect(screen.getByText(/MISS/)).toBeInTheDocument());
        expect(screen.getByText(/redis\/redis/)).toBeInTheDocument();
    });
});
```

- [ ] **Step 9: Run it, verify it fails, then implement the component, styles, and page**

Run: `npx vitest run src/__tests__/components/CacheDemo.test.tsx` (Expected: FAIL, module not found).

`src/components/CacheDemo/CacheDemo.module.scss`:

```scss
.panel {
    background: var(--panel);
    padding: 1rem;
    border-radius: 8px;
    max-width: 540px;
}

.hit {
    color: var(--hit);
}

.miss {
    color: var(--miss);
}

.row {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
}
```

`src/components/CacheDemo/CacheDemo.tsx`:

```tsx
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
    const ttl = useCountdown(result?.ttl ?? 0);

    async function handleFetch() {
        const start = performance.now();
        const next = await fetchCachedRepo(name);
        setLatencyMs(Math.round(performance.now() - start));
        setResult(next);
    }

    async function handleClear() {
        await clearCachedRepo(name);
        setResult(null);
        setLatencyMs(null);
    }

    return (
        <div className={styles.panel}>
            <div className={styles.row}>
                <label htmlFor="repo">Repo</label>
                <input id="repo" value={name} onChange={(event) => setName(event.target.value)} />
                <button onClick={handleFetch}>Fetch</button>
                <button onClick={handleClear}>Clear cache</button>
            </div>
            {result && (
                <div>
                    <p className={result.source === 'HIT' ? styles.hit : styles.miss}>
                        {result.source} — {latencyMs}ms — TTL {ttl}s
                    </p>
                    <p>{result.data.fullName}</p>
                    <p>⭐ {result.data.stars}</p>
                </div>
            )}
        </div>
    );
}
```

`src/app/caching/page.tsx`:

```tsx
/** Caching demo page. */
import { CacheDemo } from '@/components/CacheDemo/CacheDemo';

export default function CachingPage() {
    return (
        <section>
            <h1>Caching (cache-aside)</h1>
            <p>
                First fetch is a MISS (slow GitHub call); the next is a HIT until the TTL expires.
            </p>
            <CacheDemo />
        </section>
    );
}
```

Run: `npx vitest run src/__tests__/components/CacheDemo.test.tsx` (Expected: PASS).

- [ ] **Step 10: Verify and commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add -A
git commit -m "feat: add cache route, browser wrappers, and caching UI"
```

---

### Task 5: Rate limit service + route

**Files:**

- Create: `src/types/rateLimit.ts`, `src/services/rateLimit/checkRateLimit.ts`, `src/app/api/limited/route.ts`
- Test: `src/__tests__/integration/rateLimit.test.ts`, `src/__tests__/app/api/limited.test.ts`

**Interfaces:**

- Consumes: `getRedisClient` (Task 2), `WINDOW_SECONDS`, `MAX_REQUESTS`, `RATE_LIMIT_KEY_PREFIX` (Task 1).
- Produces: `RateLimitResult = { allowed: boolean; remaining: number; resetIn: number }`; `checkRateLimit(clientId: string): Promise<RateLimitResult>`; `POST /api/limited` -> 200 with result, or 429 with `Retry-After` when over.

- [ ] **Step 1: Write the type, then the failing integration test**

`src/types/rateLimit.ts`:

```ts
export type RateLimitResult = {
    allowed: boolean;
    remaining: number;
    resetIn: number;
};
```

`src/__tests__/integration/rateLimit.test.ts`:

```ts
// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { MAX_REQUESTS, RATE_LIMIT_KEY_PREFIX } from '@/constants/rateLimit';
import { checkRateLimit } from '@/services/rateLimit/checkRateLimit';

const CLIENT_ID = `test-${process.pid}`;

beforeEach(async () => {
    await getRedisClient().del(`${RATE_LIMIT_KEY_PREFIX}${CLIENT_ID}`);
});

afterAll(async () => {
    await getRedisClient().del(`${RATE_LIMIT_KEY_PREFIX}${CLIENT_ID}`);
    await getRedisClient().quit();
});

describe('checkRateLimit (integration)', () => {
    it('allows up to MAX_REQUESTS then blocks', async () => {
        let last = await checkRateLimit(CLIENT_ID);
        for (let i = 1; i < MAX_REQUESTS; i += 1) {
            last = await checkRateLimit(CLIENT_ID);
        }
        expect(last.allowed).toBe(true);
        expect(last.remaining).toBe(0);

        const blocked = await checkRateLimit(CLIENT_ID);
        expect(blocked.allowed).toBe(false);
        expect(blocked.remaining).toBe(0);
        expect(blocked.resetIn).toBeGreaterThan(0);
    });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/__tests__/integration/rateLimit.test.ts`
Expected: FAIL (service not found).

- [ ] **Step 3: Implement `checkRateLimit`**

`src/services/rateLimit/checkRateLimit.ts`:

```ts
/** Fixed-window rate limiter: INCR the per-client counter, set the window TTL on
 * the first hit, and block once the count exceeds the limit. Sliding-window and
 * token-bucket are the production-grade alternatives (more accurate at window
 * edges); fixed-window is used here for teaching clarity. */
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { MAX_REQUESTS, RATE_LIMIT_KEY_PREFIX, WINDOW_SECONDS } from '@/constants/rateLimit';
import type { RateLimitResult } from '@/types/rateLimit';

export async function checkRateLimit(clientId: string): Promise<RateLimitResult> {
    const redis = getRedisClient();
    const key = `${RATE_LIMIT_KEY_PREFIX}${clientId}`;
    const count = await redis.incr(key);
    if (count === 1) {
        await redis.expire(key, WINDOW_SECONDS);
    }
    const resetIn = await redis.ttl(key);
    if (count > MAX_REQUESTS) {
        return { allowed: false, remaining: 0, resetIn };
    }
    return { allowed: true, remaining: MAX_REQUESTS - count, resetIn };
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/__tests__/integration/rateLimit.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing route test**

`src/__tests__/app/api/limited.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

const checkRateLimit = vi.fn();
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
```

- [ ] **Step 6: Run it, verify it fails, then implement the route**

Run: `npx vitest run src/__tests__/app/api/limited.test.ts` (Expected: FAIL).

`src/app/api/limited/route.ts`:

```ts
/** Rate-limited endpoint: keys the limiter on the x-client-id header (or a
 * fallback) and returns 429 with Retry-After once the window budget is spent. */
import { checkRateLimit } from '@/services/rateLimit/checkRateLimit';

const DEFAULT_CLIENT_ID = 'anonymous';

export async function POST(request: Request) {
    const clientId = request.headers.get('x-client-id') ?? DEFAULT_CLIENT_ID;
    const result = await checkRateLimit(clientId);
    if (!result.allowed) {
        return Response.json(result, {
            status: 429,
            headers: { 'Retry-After': String(result.resetIn) },
        });
    }
    return Response.json(result);
}
```

Run again: `npx vitest run src/__tests__/app/api/limited.test.ts` (Expected: PASS).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add fixed-window rate limit service and endpoint"
```

---

### Task 6: Rate limit UI

**Files:**

- Create: `src/api/sendLimitedRequest.ts`, `src/components/RateLimitDemo/RateLimitDemo.tsx`, `src/components/RateLimitDemo/RateLimitDemo.module.scss`, `src/app/rate-limit/page.tsx`
- Test: `src/__tests__/components/RateLimitDemo.test.tsx`

**Interfaces:**

- Consumes: `RateLimitResult` (Task 5).
- Produces: `sendLimitedRequest(): Promise<{ status: number; result: RateLimitResult }>`.

- [ ] **Step 1: Implement the browser wrapper**

`src/api/sendLimitedRequest.ts`:

```ts
/** Browser wrapper for POST /api/limited; returns the HTTP status alongside the
 * parsed body so the UI can show the 429 state. */
import type { RateLimitResult } from '@/types/rateLimit';

export async function sendLimitedRequest(): Promise<{ status: number; result: RateLimitResult }> {
    const response = await fetch('/api/limited', { method: 'POST' });
    return { status: response.status, result: await response.json() };
}
```

- [ ] **Step 2: Write the failing component test**

`src/__tests__/components/RateLimitDemo.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const sendLimitedRequest = vi.fn();
vi.mock('@/api/sendLimitedRequest', () => ({ sendLimitedRequest }));

import { RateLimitDemo } from '@/components/RateLimitDemo/RateLimitDemo';

describe('RateLimitDemo', () => {
    it('shows remaining on success and a blocked state on 429', async () => {
        sendLimitedRequest.mockResolvedValueOnce({
            status: 200,
            result: { allowed: true, remaining: 3, resetIn: 9 },
        });
        render(<RateLimitDemo />);
        fireEvent.click(screen.getByRole('button', { name: /send request/i }));
        await waitFor(() => expect(screen.getByText(/remaining: 3/i)).toBeInTheDocument());

        sendLimitedRequest.mockResolvedValueOnce({
            status: 429,
            result: { allowed: false, remaining: 0, resetIn: 7 },
        });
        fireEvent.click(screen.getByRole('button', { name: /send request/i }));
        await waitFor(() => expect(screen.getByText(/blocked/i)).toBeInTheDocument());
    });
});
```

- [ ] **Step 3: Run it, verify it fails, then implement the component, styles, and page**

Run: `npx vitest run src/__tests__/components/RateLimitDemo.test.tsx` (Expected: FAIL).

`src/components/RateLimitDemo/RateLimitDemo.module.scss`:

```scss
.panel {
    background: var(--panel);
    padding: 1rem;
    border-radius: 8px;
    max-width: 540px;
}

.blocked {
    color: var(--error);
    font-weight: 700;
}
```

`src/components/RateLimitDemo/RateLimitDemo.tsx`:

```tsx
/** Rate-limit demo: fire requests at /api/limited and watch the remaining budget
 * fall to zero and flip to a blocked (429) state. */
'use client';

import { useState } from 'react';
import { sendLimitedRequest } from '@/api/sendLimitedRequest';
import type { RateLimitResult } from '@/types/rateLimit';
import styles from './RateLimitDemo.module.scss';

const SPAM_COUNT = 15;

export function RateLimitDemo() {
    const [result, setResult] = useState<RateLimitResult | null>(null);
    const [blocked, setBlocked] = useState(false);

    async function sendOne() {
        const { status, result: next } = await sendLimitedRequest();
        setResult(next);
        setBlocked(status === 429);
    }

    async function spam() {
        for (let i = 0; i < SPAM_COUNT; i += 1) {
            await sendOne();
        }
    }

    return (
        <div className={styles.panel}>
            <button onClick={sendOne}>Send request</button>
            <button onClick={spam}>Spam {SPAM_COUNT}</button>
            {result && (
                <p className={blocked ? styles.blocked : undefined}>
                    {blocked ? 'BLOCKED (429)' : 'OK'} — remaining: {result.remaining} — reset in{' '}
                    {result.resetIn}s
                </p>
            )}
        </div>
    );
}
```

`src/app/rate-limit/page.tsx`:

```tsx
/** Rate-limit demo page. */
import { RateLimitDemo } from '@/components/RateLimitDemo/RateLimitDemo';

export default function RateLimitPage() {
    return (
        <section>
            <h1>Rate Limiting (fixed window)</h1>
            <p>
                Up to 10 requests per 10s window. Beyond that you get a 429 until the window resets.
            </p>
            <RateLimitDemo />
        </section>
    );
}
```

Run: `npx vitest run src/__tests__/components/RateLimitDemo.test.tsx` (Expected: PASS).

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add -A
git commit -m "feat: add rate limit UI"
```

---

### Task 7: Queue service (queue, enqueue, processJob, state, list)

**Files:**

- Create: `src/types/job.ts`
- Create: `src/services/queue/getJobQueue.ts`, `src/services/queue/enqueueJob.ts`, `src/services/queue/processJob.ts`, `src/services/queue/toJobSummary.ts`, `src/services/queue/getJobState.ts`, `src/services/queue/listJobs.ts`
- Test: `src/__tests__/services/queue/processJob.test.ts`, `src/__tests__/integration/queue.test.ts`

**Interfaces:**

- Consumes: `createRedisClient`, `getRedisClient` (Task 2); queue constants (Task 1).
- Produces: `JobType = 'normal' | 'flaky'`; `JobData = { type: JobType; label: string }`; `JobResult = { label: string; processedAt: string }`; `JobSummary = { id: string; state: string; type: JobType; label: string; attemptsMade: number; returnValue: JobResult | null; failedReason: string | null }`; `getJobQueue(): Queue`; `enqueueJob(type: JobType, label: string): Promise<string>`; `processJob(job: Job<JobData>): Promise<JobResult>`; `toJobSummary(job: Job, state): JobSummary`; `getJobState(id: string): Promise<JobSummary | null>`; `listJobs(): Promise<JobSummary[]>`.

- [ ] **Step 1: Write the types**

`src/types/job.ts`:

```ts
export type JobType = 'normal' | 'flaky';

export type JobData = {
    type: JobType;
    label: string;
};

export type JobResult = {
    label: string;
    processedAt: string;
};

export type JobSummary = {
    id: string;
    state: string;
    type: JobType;
    label: string;
    attemptsMade: number;
    returnValue: JobResult | null;
    failedReason: string | null;
};
```

- [ ] **Step 2: Write the failing unit test for `processJob` (throw path, no Redis)**

`src/__tests__/services/queue/processJob.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/clients/redis/getRedisClient', () => ({
    getRedisClient: () => ({ set: vi.fn().mockResolvedValue('OK') }),
}));

import { processJob } from '@/services/queue/processJob';
import type { JobData } from '@/types/job';

function fakeJob(data: JobData, attemptsMade: number) {
    return { id: 'job-1', data, attemptsMade } as never;
}

describe('processJob', () => {
    it('throws for a flaky job on the first attempt', async () => {
        await expect(processJob(fakeJob({ type: 'flaky', label: 'x' }, 0))).rejects.toThrow(
            /Simulated failure/,
        );
    });

    it('resolves with a result for a normal job', async () => {
        const result = await processJob(fakeJob({ type: 'normal', label: 'welcome' }, 0));
        expect(result.label).toBe('welcome');
        expect(typeof result.processedAt).toBe('string');
    });

    it('resolves for a flaky job once it has retried enough', async () => {
        const result = await processJob(fakeJob({ type: 'flaky', label: 'ok-now' }, 2));
        expect(result.label).toBe('ok-now');
    });
});
```

- [ ] **Step 3: Run it, verify it fails, then implement `processJob`**

Run: `npx vitest run src/__tests__/services/queue/processJob.test.ts` (Expected: FAIL).

`src/services/queue/processJob.ts`:

```ts
/** Worker job handler. A 'flaky' job fails on its first two attempts then
 * succeeds, demonstrating BullMQ retries + exponential backoff. Every successful
 * run writes a result record to Redis so the UI can show what was processed. */
import type { Job } from 'bullmq';
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { RESULT_KEY_PREFIX, RESULT_TTL_SECONDS } from '@/constants/queue';
import type { JobData, JobResult } from '@/types/job';

const FLAKY_SUCCESS_ATTEMPT = 2;

export async function processJob(job: Job<JobData>): Promise<JobResult> {
    const { type, label } = job.data;
    console.log(`processing ${job.id} (${type})`);
    if (type === 'flaky' && job.attemptsMade < FLAKY_SUCCESS_ATTEMPT) {
        throw new Error(`Simulated failure for job ${job.id} (attempt ${job.attemptsMade + 1})`);
    }
    const result: JobResult = { label, processedAt: new Date().toISOString() };
    await getRedisClient().set(
        `${RESULT_KEY_PREFIX}${job.id}`,
        JSON.stringify(result),
        'EX',
        RESULT_TTL_SECONDS,
    );
    return result;
}
```

Run again: `npx vitest run src/__tests__/services/queue/processJob.test.ts` (Expected: PASS).

- [ ] **Step 4: Implement the queue, enqueue, summary, state, and list modules**

`src/services/queue/getJobQueue.ts`:

```ts
/** Lazily builds the shared BullMQ Queue (producer side). BullMQ requires a
 * connection with maxRetriesPerRequest: null, so it gets its own ioredis
 * connection rather than reusing the shared command client. */
import { Queue } from 'bullmq';
import { createRedisClient } from '@/clients/redis/createRedisClient';
import { QUEUE_NAME } from '@/constants/queue';

let queue: Queue | undefined;

export function getJobQueue(): Queue {
    if (!queue) {
        queue = new Queue(QUEUE_NAME, {
            connection: createRedisClient({ maxRetriesPerRequest: null }),
        });
    }
    return queue;
}
```

`src/services/queue/enqueueJob.ts`:

```ts
/** Adds a job to the demo queue with the configured retry/backoff policy. */
import { BACKOFF_DELAY_MS, JOB_ATTEMPTS, JOB_NAME } from '@/constants/queue';
import type { JobType } from '@/types/job';
import { getJobQueue } from './getJobQueue';

export async function enqueueJob(type: JobType, label: string): Promise<string> {
    const job = await getJobQueue().add(
        JOB_NAME,
        { type, label },
        { attempts: JOB_ATTEMPTS, backoff: { type: 'exponential', delay: BACKOFF_DELAY_MS } },
    );
    if (!job.id) {
        throw new Error('Job was created without an id');
    }
    return job.id;
}
```

`src/services/queue/toJobSummary.ts`:

```ts
/** Maps a BullMQ Job (plus its resolved state) to the UI-facing JobSummary. */
import type { Job, JobState } from 'bullmq';
import type { JobSummary } from '@/types/job';

export function toJobSummary(job: Job, state: JobState | 'unknown'): JobSummary {
    return {
        id: job.id ?? '',
        state,
        type: job.data.type,
        label: job.data.label,
        attemptsMade: job.attemptsMade,
        returnValue: job.returnvalue ?? null,
        failedReason: job.failedReason ?? null,
    };
}
```

`src/services/queue/getJobState.ts`:

```ts
/** Reads a single job's current state, or null when it no longer exists. */
import type { JobSummary } from '@/types/job';
import { getJobQueue } from './getJobQueue';
import { toJobSummary } from './toJobSummary';

export async function getJobState(id: string): Promise<JobSummary | null> {
    const job = await getJobQueue().getJob(id);
    if (!job) {
        return null;
    }
    return toJobSummary(job, await job.getState());
}
```

`src/services/queue/listJobs.ts`:

```ts
/** Lists recent jobs across lifecycle states for the job board. */
import type { JobSummary } from '@/types/job';
import { getJobQueue } from './getJobQueue';
import { toJobSummary } from './toJobSummary';

const LIST_LIMIT = 20;

export async function listJobs(): Promise<JobSummary[]> {
    const queue = getJobQueue();
    const jobs = await queue.getJobs(
        ['waiting', 'active', 'completed', 'failed', 'delayed'],
        0,
        LIST_LIMIT,
    );
    return Promise.all(
        jobs.filter(Boolean).map(async (job) => toJobSummary(job, await job.getState())),
    );
}
```

- [ ] **Step 5: Write the failing integration test (enqueue + drain via a real worker)**

`src/__tests__/integration/queue.test.ts`:

```ts
// @vitest-environment node
import { Worker } from 'bullmq';
import { afterAll, describe, expect, it } from 'vitest';
import { createRedisClient } from '@/clients/redis/createRedisClient';
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { QUEUE_NAME, RESULT_KEY_PREFIX } from '@/constants/queue';
import { enqueueJob } from '@/services/queue/enqueueJob';
import { getJobState } from '@/services/queue/getJobState';
import { processJob } from '@/services/queue/processJob';

const worker = new Worker(QUEUE_NAME, processJob, {
    connection: createRedisClient({ maxRetriesPerRequest: null }),
});

afterAll(async () => {
    await worker.close();
    await getRedisClient().quit();
});

function waitForCompletion(jobId: string): Promise<void> {
    return new Promise((resolve) => {
        worker.on('completed', (job) => {
            if (job.id === jobId) {
                resolve();
            }
        });
    });
}

describe('job queue (integration)', () => {
    it('processes a normal job to completion and stores a result', async () => {
        const jobId = await enqueueJob('normal', 'welcome-email');
        await waitForCompletion(jobId);
        const summary = await getJobState(jobId);
        expect(summary?.state).toBe('completed');
        expect(summary?.returnValue?.label).toBe('welcome-email');
        const stored = await getRedisClient().get(`${RESULT_KEY_PREFIX}${jobId}`);
        expect(stored).toContain('welcome-email');
    }, 15000);
});
```

- [ ] **Step 6: Run it, verify it passes (worker drains the job)**

Run: `npx vitest run src/__tests__/integration/queue.test.ts`
Expected: PASS (1 test). Requires `docker compose up -d`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add BullMQ queue service (enqueue, process, state, list)"
```

---

### Task 8: Worker entry point + queue routes

**Files:**

- Create: `worker.ts` (repo root)
- Create: `src/app/api/jobs/route.ts`, `src/app/api/jobs/[id]/route.ts`
- Create: `src/api/enqueueJob.ts`, `src/api/fetchJobs.ts`, `src/api/fetchJob.ts`
- Test: `src/__tests__/app/api/jobs.test.ts`

**Interfaces:**

- Consumes: `enqueueJob`, `listJobs`, `getJobState`, `processJob` (Task 7); `QUEUE_NAME` (Task 1), `WORKER_PORT` (Task 1), `createRedisClient` (Task 2).
- Produces: `POST /api/jobs` `{ type, label }` -> `{ jobId }` (400 on bad body); `GET /api/jobs` -> `JobSummary[]`; `GET /api/jobs/:id` -> `JobSummary` (404 if missing); browser wrappers `enqueueJob(type, label)`, `fetchJobs()`, `fetchJob(id)`.

- [ ] **Step 1: Write the worker entry (relative imports so `tsx` needs no path-alias resolution)**

`worker.ts`:

```ts
/** Standalone BullMQ worker process. Run with `npm run worker` alongside the
 * Next.js dev server. Processes demo jobs and exposes a health endpoint. */
import { Worker } from 'bullmq';
import { createServer } from 'node:http';
import { createRedisClient } from './src/clients/redis/createRedisClient';
import { WORKER_PORT } from './src/constants/ports';
import { QUEUE_NAME } from './src/constants/queue';
import { processJob } from './src/services/queue/processJob';

const worker = new Worker(QUEUE_NAME, processJob, {
    connection: createRedisClient({ maxRetriesPerRequest: null }),
});

worker.on('completed', (job) => console.log(`completed ${job.id}`));
worker.on('failed', (job, error) => console.log(`failed ${job?.id}: ${error.message}`));

createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok' }));
}).listen(WORKER_PORT, () => console.log(`worker health on ${WORKER_PORT}`));
```

- [ ] **Step 2: Write the failing route test**

`src/__tests__/app/api/jobs.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

const enqueueJob = vi.fn();
const listJobs = vi.fn();
vi.mock('@/services/queue/enqueueJob', () => ({ enqueueJob }));
vi.mock('@/services/queue/listJobs', () => ({ listJobs }));

import { GET, POST } from '@/app/api/jobs/route';

function postJson(body: unknown) {
    return new Request('http://x/api/jobs', { method: 'POST', body: JSON.stringify(body) });
}

describe('POST /api/jobs', () => {
    it('enqueues a valid job and returns the id', async () => {
        enqueueJob.mockResolvedValueOnce('job-9');
        const response = await POST(postJson({ type: 'normal', label: 'hi' }));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ jobId: 'job-9' });
    });

    it('returns 400 for an invalid job type', async () => {
        const response = await POST(postJson({ type: 'bogus', label: 'hi' }));
        expect(response.status).toBe(400);
    });

    it('returns 400 for a missing label', async () => {
        const response = await POST(postJson({ type: 'normal' }));
        expect(response.status).toBe(400);
    });
});

describe('GET /api/jobs', () => {
    it('returns the job list', async () => {
        listJobs.mockResolvedValueOnce([{ id: 'job-1', state: 'completed' }]);
        const response = await GET();
        expect(await response.json()).toHaveLength(1);
    });
});
```

- [ ] **Step 3: Run it, verify it fails, then implement the routes**

Run: `npx vitest run src/__tests__/app/api/jobs.test.ts` (Expected: FAIL).

`src/app/api/jobs/route.ts`:

```ts
/** Queue demo endpoints: POST enqueues a job, GET lists recent jobs. */
import { z } from 'zod';
import { enqueueJob } from '@/services/queue/enqueueJob';
import { listJobs } from '@/services/queue/listJobs';

const EnqueueSchema = z.object({
    type: z.enum(['normal', 'flaky']),
    label: z.string().min(1).max(100),
});

export async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const parsed = EnqueueSchema.safeParse(body);
    if (!parsed.success) {
        return Response.json({ error: 'Invalid body' }, { status: 400 });
    }
    const jobId = await enqueueJob(parsed.data.type, parsed.data.label);
    return Response.json({ jobId });
}

export async function GET() {
    return Response.json(await listJobs());
}
```

`src/app/api/jobs/[id]/route.ts`:

```ts
/** Returns a single job's current lifecycle state. */
import { getJobState } from '@/services/queue/getJobState';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const job = await getJobState(id);
    if (!job) {
        return Response.json({ error: 'Not found' }, { status: 404 });
    }
    return Response.json(job);
}
```

Run again: `npx vitest run src/__tests__/app/api/jobs.test.ts` (Expected: PASS).

- [ ] **Step 4: Implement the browser wrappers**

`src/api/enqueueJob.ts`:

```ts
/** Browser wrapper for POST /api/jobs. */
import type { JobType } from '@/types/job';

export async function enqueueJob(type: JobType, label: string): Promise<string> {
    const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, label }),
    });
    if (!response.ok) {
        throw new Error(`Enqueue failed: ${response.status}`);
    }
    const body = await response.json();
    return body.jobId;
}
```

`src/api/fetchJobs.ts`:

```ts
/** Browser wrapper for GET /api/jobs. */
import type { JobSummary } from '@/types/job';

export async function fetchJobs(): Promise<JobSummary[]> {
    const response = await fetch('/api/jobs');
    if (!response.ok) {
        throw new Error(`Fetch jobs failed: ${response.status}`);
    }
    return response.json();
}
```

`src/api/fetchJob.ts`:

```ts
/** Browser wrapper for GET /api/jobs/:id. */
import type { JobSummary } from '@/types/job';

export async function fetchJob(id: string): Promise<JobSummary> {
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}`);
    if (!response.ok) {
        throw new Error(`Fetch job failed: ${response.status}`);
    }
    return response.json();
}
```

- [ ] **Step 5: Verify and commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add -A
git commit -m "feat: add worker process and queue routes with browser wrappers"
```

---

### Task 9: Queue UI (job board)

**Files:**

- Create: `src/state/useJobBoard.ts`, `src/components/JobBoard/JobBoard.tsx`, `src/components/JobBoard/JobBoard.module.scss`, `src/app/queue/page.tsx`
- Test: `src/__tests__/components/JobBoard.test.tsx`

**Interfaces:**

- Consumes: `fetchJobs` (Task 8), `enqueueJob` (Task 8), `JobSummary` (Task 7).
- Produces: `useJobBoard(): { jobs: JobSummary[]; refresh: () => Promise<void> }`.

- [ ] **Step 1: Implement the polling hook**

`src/state/useJobBoard.ts`:

```ts
/** Polls GET /api/jobs on an interval so the board reflects worker progress. */
import { useCallback, useEffect, useState } from 'react';
import { fetchJobs } from '@/api/fetchJobs';
import type { JobSummary } from '@/types/job';

const POLL_INTERVAL_MS = 1000;

export function useJobBoard() {
    const [jobs, setJobs] = useState<JobSummary[]>([]);

    const refresh = useCallback(async () => {
        setJobs(await fetchJobs());
    }, []);

    useEffect(() => {
        void refresh();
        const interval = setInterval(() => void refresh(), POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [refresh]);

    return { jobs, refresh };
}
```

- [ ] **Step 2: Write the failing component test**

`src/__tests__/components/JobBoard.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/api/fetchJobs', () => ({
    fetchJobs: vi.fn().mockResolvedValue([
        {
            id: 'job-1',
            state: 'completed',
            type: 'normal',
            label: 'a',
            attemptsMade: 1,
            returnValue: null,
            failedReason: null,
        },
        {
            id: 'job-2',
            state: 'failed',
            type: 'flaky',
            label: 'b',
            attemptsMade: 3,
            returnValue: null,
            failedReason: 'boom',
        },
    ]),
}));
vi.mock('@/api/enqueueJob', () => ({ enqueueJob: vi.fn().mockResolvedValue('job-3') }));

import { JobBoard } from '@/components/JobBoard/JobBoard';

describe('JobBoard', () => {
    it('renders jobs grouped by state', async () => {
        render(<JobBoard />);
        await waitFor(() => expect(screen.getByText('job-1')).toBeInTheDocument());
        expect(screen.getByText('job-2')).toBeInTheDocument();
        expect(screen.getByText(/boom/)).toBeInTheDocument();
    });
});
```

- [ ] **Step 3: Run it, verify it fails, then implement the component, styles, and page**

Run: `npx vitest run src/__tests__/components/JobBoard.test.tsx` (Expected: FAIL).

`src/components/JobBoard/JobBoard.module.scss`:

```scss
.board {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
}

.column {
    background: var(--panel);
    padding: 0.75rem;
    border-radius: 8px;
}

.job {
    border-top: 1px solid #2a3340;
    padding: 0.4rem 0;
    font-size: 0.85rem;
}

.controls {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
}
```

`src/components/JobBoard/JobBoard.tsx`:

```tsx
/** Queue demo: enqueue normal/flaky jobs and watch them move through the
 * waiting / active / completed / failed columns as the worker processes them. */
'use client';

import { enqueueJob } from '@/api/enqueueJob';
import { useJobBoard } from '@/state/useJobBoard';
import type { JobSummary } from '@/types/job';
import styles from './JobBoard.module.scss';

const COLUMNS: { state: string; title: string }[] = [
    { state: 'waiting', title: 'Waiting' },
    { state: 'active', title: 'Active' },
    { state: 'completed', title: 'Completed' },
    { state: 'failed', title: 'Failed' },
];

export function JobBoard() {
    const { jobs, refresh } = useJobBoard();

    async function add(type: 'normal' | 'flaky') {
        await enqueueJob(type, `${type}-${jobs.length + 1}`);
        await refresh();
    }

    return (
        <div>
            <div className={styles.controls}>
                <button onClick={() => add('normal')}>Enqueue normal job</button>
                <button onClick={() => add('flaky')}>Enqueue flaky job</button>
            </div>
            <div className={styles.board}>
                {COLUMNS.map((column) => (
                    <div key={column.state} className={styles.column}>
                        <h3>{column.title}</h3>
                        {jobs
                            .filter((job) => matchesColumn(job, column.state))
                            .map((job) => (
                                <div key={job.id} className={styles.job}>
                                    <div>{job.id}</div>
                                    <div>
                                        {job.type} · attempts {job.attemptsMade}
                                    </div>
                                    {job.failedReason && <div>{job.failedReason}</div>}
                                </div>
                            ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

function matchesColumn(job: JobSummary, state: string): boolean {
    if (state === 'waiting') {
        return job.state === 'waiting' || job.state === 'delayed';
    }
    return job.state === state;
}
```

`src/app/queue/page.tsx`:

```tsx
/** Queue demo page. */
import { JobBoard } from '@/components/JobBoard/JobBoard';

export default function QueuePage() {
    return (
        <section>
            <h1>Job Queue (BullMQ)</h1>
            <p>
                Enqueue jobs and watch a separate worker process them. Flaky jobs fail twice, then
                succeed on retry (exponential backoff). Run <code>npm run worker</code> in a second
                terminal.
            </p>
            <JobBoard />
        </section>
    );
}
```

Run: `npx vitest run src/__tests__/components/JobBoard.test.tsx` (Expected: PASS).

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add -A
git commit -m "feat: add queue job board UI"
```

---

### Task 10: Pub/Sub service + SSE encoder

**Files:**

- Create: `src/types/pubsubMessage.ts`, `src/services/sse/encodeSseEvent.ts`, `src/services/pubsub/publishMessage.ts`, `src/services/pubsub/subscribeToChannel.ts`
- Test: `src/__tests__/services/sse/encodeSseEvent.test.ts`, `src/__tests__/integration/pubsub.test.ts`

**Interfaces:**

- Consumes: `getRedisClient`, `getRedisSubscriber` (Task 2); `CHANNEL` (Task 1).
- Produces: `PubSubMessage = { message: string }`; `encodeSseEvent(data: unknown): string`; `publishMessage(message: string): Promise<void>`; `subscribeToChannel(onMessage: (message: string) => void): Promise<() => void>` (returns an unsubscribe function).

- [ ] **Step 1: Write the type and the failing SSE encoder test**

`src/types/pubsubMessage.ts`:

```ts
export type PubSubMessage = {
    message: string;
};
```

`src/__tests__/services/sse/encodeSseEvent.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { encodeSseEvent } from '@/services/sse/encodeSseEvent';

describe('encodeSseEvent', () => {
    it('serializes to a data: frame that round-trips', () => {
        const wire = encodeSseEvent({ message: 'hello' });
        expect(wire).toBe('data: {"message":"hello"}\n\n');
        const parsed = JSON.parse(wire.replace('data: ', '').trim());
        expect(parsed).toEqual({ message: 'hello' });
    });
});
```

- [ ] **Step 2: Run it, verify it fails, then implement the encoder**

Run: `npx vitest run src/__tests__/services/sse/encodeSseEvent.test.ts` (Expected: FAIL).

`src/services/sse/encodeSseEvent.ts`:

```ts
/** Serializes an event object to a single SSE `data:` frame. */
export function encodeSseEvent(data: unknown): string {
    return `data: ${JSON.stringify(data)}\n\n`;
}
```

Run again (Expected: PASS).

- [ ] **Step 3: Implement publish/subscribe**

`src/services/pubsub/publishMessage.ts`:

```ts
/** Publishes a message to the demo channel (fire-and-forget; no persistence). */
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { CHANNEL } from '@/constants/pubsub';

export async function publishMessage(message: string): Promise<void> {
    await getRedisClient().publish(CHANNEL, message);
}
```

`src/services/pubsub/subscribeToChannel.ts`:

```ts
/** Subscribes to the demo channel on the dedicated subscriber connection and
 * invokes onMessage for each message. Returns an unsubscribe that detaches this
 * listener (the shared subscriber stays subscribed for other live clients). */
import { getRedisSubscriber } from '@/clients/redis/getRedisSubscriber';
import { CHANNEL } from '@/constants/pubsub';

export async function subscribeToChannel(
    onMessage: (message: string) => void,
): Promise<() => void> {
    const subscriber = getRedisSubscriber();
    await subscriber.subscribe(CHANNEL);
    const handler = (channel: string, message: string) => {
        if (channel === CHANNEL) {
            onMessage(message);
        }
    };
    subscriber.on('message', handler);
    return () => subscriber.off('message', handler);
}
```

- [ ] **Step 4: Write the failing pub/sub integration test**

`src/__tests__/integration/pubsub.test.ts`:

```ts
// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest';
import { disconnectRedis } from '@/clients/redis/disconnectRedis';
import { publishMessage } from '@/services/pubsub/publishMessage';
import { subscribeToChannel } from '@/services/pubsub/subscribeToChannel';

afterAll(async () => {
    await disconnectRedis();
});

describe('pub/sub (integration)', () => {
    it('delivers a published message to a subscriber', async () => {
        const received: string[] = [];
        const unsubscribe = await subscribeToChannel((message) => received.push(message));
        await publishMessage('ping');
        await new Promise((resolve) => setTimeout(resolve, 200));
        unsubscribe();
        expect(received).toContain('ping');
    });
});
```

- [ ] **Step 5: Run it, verify it passes**

Run: `npx vitest run src/__tests__/integration/pubsub.test.ts`
Expected: PASS. Requires `docker compose up -d`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add pub/sub service and SSE encoder"
```

---

### Task 11: Pub/Sub routes + UI

**Files:**

- Create: `src/app/api/pubsub/publish/route.ts`, `src/app/api/pubsub/stream/route.ts`
- Create: `src/api/publishMessage.ts`, `src/state/usePubSubStream.ts`
- Create: `src/components/PubSubTicker/PubSubTicker.tsx`, `src/components/PubSubTicker/PubSubTicker.module.scss`, `src/app/pubsub/page.tsx`
- Test: `src/__tests__/app/api/pubsubPublish.test.ts`, `src/__tests__/components/PubSubTicker.test.tsx`

**Interfaces:**

- Consumes: `publishMessage` (service, Task 10), `subscribeToChannel` (Task 10), `encodeSseEvent` (Task 10).
- Produces: `POST /api/pubsub/publish` `{ message }` -> `{ published: true }` (400 on bad body); `GET /api/pubsub/stream` -> SSE stream; browser `publishMessage(message: string): Promise<void>`; `usePubSubStream(): string[]`.

- [ ] **Step 1: Write the failing publish-route test**

`src/__tests__/app/api/pubsubPublish.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

const publishMessage = vi.fn();
vi.mock('@/services/pubsub/publishMessage', () => ({ publishMessage }));

import { POST } from '@/app/api/pubsub/publish/route';

function postJson(body: unknown) {
    return new Request('http://x/api/pubsub/publish', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

describe('POST /api/pubsub/publish', () => {
    it('publishes a valid message', async () => {
        publishMessage.mockResolvedValueOnce(undefined);
        const response = await POST(postJson({ message: 'hi' }));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ published: true });
    });

    it('returns 400 for an empty message', async () => {
        const response = await POST(postJson({ message: '' }));
        expect(response.status).toBe(400);
    });
});
```

- [ ] **Step 2: Run it, verify it fails, then implement both routes**

Run: `npx vitest run src/__tests__/app/api/pubsubPublish.test.ts` (Expected: FAIL).

`src/app/api/pubsub/publish/route.ts`:

```ts
/** Publishes a message to the pub/sub demo channel. */
import { z } from 'zod';
import { publishMessage } from '@/services/pubsub/publishMessage';

const PublishSchema = z.object({ message: z.string().min(1).max(280) });

export async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const parsed = PublishSchema.safeParse(body);
    if (!parsed.success) {
        return Response.json({ error: 'Invalid body' }, { status: 400 });
    }
    await publishMessage(parsed.data.message);
    return Response.json({ published: true });
}
```

`src/app/api/pubsub/stream/route.ts`:

```ts
/** SSE stream of pub/sub channel messages. Subscribes on connect, streams each
 * message as an SSE frame, and unsubscribes when the client disconnects. */
import { subscribeToChannel } from '@/services/pubsub/subscribeToChannel';
import { encodeSseEvent } from '@/services/sse/encodeSseEvent';

export const dynamic = 'force-dynamic';

export async function GET() {
    const encoder = new TextEncoder();
    let unsubscribe: () => void = () => {};
    const stream = new ReadableStream({
        async start(controller) {
            unsubscribe = await subscribeToChannel((message) => {
                controller.enqueue(encoder.encode(encodeSseEvent({ message })));
            });
        },
        cancel() {
            unsubscribe();
        },
    });
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
}
```

Run again: `npx vitest run src/__tests__/app/api/pubsubPublish.test.ts` (Expected: PASS).

- [ ] **Step 3: Implement the browser wrapper and the SSE hook**

`src/api/publishMessage.ts`:

```ts
/** Browser wrapper for POST /api/pubsub/publish. */
export async function publishMessage(message: string): Promise<void> {
    const response = await fetch('/api/pubsub/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
    });
    if (!response.ok) {
        throw new Error(`Publish failed: ${response.status}`);
    }
}
```

`src/state/usePubSubStream.ts`:

```ts
/** Opens the SSE stream and accumulates received messages newest-last. */
import { useEffect, useState } from 'react';

export function usePubSubStream(): string[] {
    const [messages, setMessages] = useState<string[]>([]);

    useEffect(() => {
        const source = new EventSource('/api/pubsub/stream');
        source.onmessage = (event) => {
            const { message } = JSON.parse(event.data);
            setMessages((current) => [...current, message]);
        };
        return () => source.close();
    }, []);

    return messages;
}
```

- [ ] **Step 4: Write the failing ticker component test**

`src/__tests__/components/PubSubTicker.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/state/usePubSubStream', () => ({ usePubSubStream: () => ['first', 'second'] }));
const publishMessage = vi.fn().mockResolvedValue(undefined);
vi.mock('@/api/publishMessage', () => ({ publishMessage }));

import { PubSubTicker } from '@/components/PubSubTicker/PubSubTicker';

describe('PubSubTicker', () => {
    it('renders streamed messages and publishes new ones', async () => {
        render(<PubSubTicker />);
        expect(screen.getByText('first')).toBeInTheDocument();
        expect(screen.getByText('second')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'hey' } });
        fireEvent.click(screen.getByRole('button', { name: /publish/i }));
        expect(publishMessage).toHaveBeenCalledWith('hey');
    });
});
```

- [ ] **Step 5: Run it, verify it fails, then implement the component, styles, and page**

Run: `npx vitest run src/__tests__/components/PubSubTicker.test.tsx` (Expected: FAIL).

`src/components/PubSubTicker/PubSubTicker.module.scss`:

```scss
.panel {
    background: var(--panel);
    padding: 1rem;
    border-radius: 8px;
    max-width: 540px;
}

.row {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.ticker {
    max-height: 240px;
    overflow-y: auto;
}

.message {
    border-top: 1px solid #2a3340;
    padding: 0.4rem 0;
}
```

`src/components/PubSubTicker/PubSubTicker.tsx`:

```tsx
/** Pub/Sub demo: publish a message and watch it (and messages from other tabs)
 * arrive live over an SSE stream. */
'use client';

import { useState } from 'react';
import { publishMessage } from '@/api/publishMessage';
import { usePubSubStream } from '@/state/usePubSubStream';
import styles from './PubSubTicker.module.scss';

export function PubSubTicker() {
    const messages = usePubSubStream();
    const [draft, setDraft] = useState('');

    async function handlePublish() {
        if (!draft) {
            return;
        }
        await publishMessage(draft);
        setDraft('');
    }

    return (
        <div className={styles.panel}>
            <div className={styles.row}>
                <label htmlFor="message">Message</label>
                <input
                    id="message"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                />
                <button onClick={handlePublish}>Publish</button>
            </div>
            <div className={styles.ticker}>
                {messages.map((message, index) => (
                    <div key={index} className={styles.message}>
                        {message}
                    </div>
                ))}
            </div>
        </div>
    );
}
```

`src/app/pubsub/page.tsx`:

```tsx
/** Pub/Sub demo page. */
import { PubSubTicker } from '@/components/PubSubTicker/PubSubTicker';

export default function PubSubPage() {
    return (
        <section>
            <h1>Pub/Sub (live feed)</h1>
            <p>
                Publish a message; it streams to every open tab over SSE. Open two tabs to see it.
            </p>
            <PubSubTicker />
        </section>
    );
}
```

Run: `npx vitest run src/__tests__/components/PubSubTicker.test.tsx` (Expected: PASS).

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add -A
git commit -m "feat: add pub/sub routes and live ticker UI"
```

---

### Task 12: CI workflow, Playwright config, README

**Files:**

- Create: `.github/workflows/ci.yml`, `playwright.config.ts`, `README.md`

**Interfaces:**

- Consumes: every prior task (this wires CI to run the full suite against a Redis service container).

- [ ] **Step 1: Write the CI workflow with a Redis service container in both jobs**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
    push:
        branches: [main]
    pull_request:

jobs:
    verify:
        runs-on: ubuntu-latest
        services:
            redis:
                image: redis:7
                ports:
                    - 6379:6379
        env:
            REDIS_URL: redis://localhost:6379
        steps:
            - uses: actions/checkout@v5
            - uses: actions/setup-node@v5
              with:
                  node-version: '24'
                  cache: npm
            - run: npm ci
            - name: Typecheck
              run: npx tsc --noEmit
            - name: Lint
              run: npm run lint
            - name: Format check
              run: npm run format:check
            - name: Test
              run: npm test
            - name: Build
              run: npm run build

    e2e:
        runs-on: ubuntu-latest
        services:
            redis:
                image: redis:7
                ports:
                    - 6379:6379
        env:
            REDIS_URL: redis://localhost:6379
        steps:
            - uses: actions/checkout@v5
            - uses: actions/setup-node@v5
              with:
                  node-version: '24'
                  cache: npm
            - run: npm ci
            - name: Install Playwright browsers
              run: npx playwright install --with-deps chromium
            - name: Run E2E tests
              run: npx playwright test
              env:
                  REDIS_URL: redis://localhost:6379
```

- [ ] **Step 2: Write the Playwright config (ported; REDIS_URL in webServer env)**

`playwright.config.ts`:

```ts
/** Playwright configuration: chromium-only; the web server builds and starts the
 * production app so specs run against the real Next.js server. E2E specs are a
 * post-MVP follow-up; this config is wired so adding them is drop-in. */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: 'npm run build && npm run start',
        url: 'http://localhost:3000',
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        env: {
            REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
        },
    },
});
```

- [ ] **Step 3: Write the README**

`README.md`:

```markdown
# Redis Patterns Demo (educational MVP)

A single Next.js app demonstrating four common production uses of Redis:
caching, rate limiting, a background job queue, and pub/sub.

## What it does

- **Caching** (`/caching`) — cache-aside over the GitHub repo API. First fetch is
  a MISS (slow); the next is a HIT until the TTL expires. Includes invalidation.
- **Rate limiting** (`/rate-limit`) — fixed-window limiter (10 req / 10s). Spam
  the button and watch requests get 429'd with a reset countdown.
- **Queue** (`/queue`) — BullMQ jobs processed by a separate worker, with retries
  and exponential backoff. Flaky jobs fail twice then succeed.
- **Pub/Sub** (`/pubsub`) — publish a message and watch it stream live to every
  open tab over SSE.

## Setup

1. `npm install`
2. `docker compose up -d` (starts Redis on 6379)
3. Copy `.env.example` to `.env` (defaults work for local Redis). `GITHUB_TOKEN`
   is optional and raises GitHub's rate limit.
4. `npm run dev` — open http://localhost:3000
5. In a second terminal: `npm run worker` (required for the Queue demo)

## Architecture

- `src/clients/redis/` — ioredis connections: a shared command client, a
  dedicated subscriber (a subscribed connection can't run normal commands), and
  per-queue BullMQ connections.
- `src/clients/github/` — raw GitHub REST call.
- `src/services/` — the business logic: `cache/`, `rateLimit/`, `queue/`,
  `pubsub/`, `sse/`.
- `src/app/api/` — thin route handlers that call services.
- `worker.ts` — standalone BullMQ worker process (health endpoint on 3002).

## Tests

`npm test` runs the Vitest suite. Integration tests under
`src/__tests__/integration/` hit a real Redis, so `docker compose up -d` must be
running first. They isolate by key prefix and never flush the database.

## Deployment

Code targets a single `REDIS_URL`, so deploying means pointing it at a hosted
Redis (e.g. Upstash). Note: BullMQ needs the TCP endpoint, not a REST-only tier.
```

- [ ] **Step 4: Final full verification**

Run: `docker compose up -d && npx tsc --noEmit && npm run lint && npm run format:check && npm test && npm run build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add CI workflow, Playwright config, and README"
```

---

## Self-Review

**Spec coverage:**

- Caching (cache-aside, GitHub, HIT/MISS, TTL, invalidation) → Tasks 3, 4. ✓
- Rate limiting (fixed-window INCR/EXPIRE, 429 + Retry-After) → Tasks 5, 6. ✓
- Job queue (BullMQ, separate worker, retries/backoff, flaky job, simulated task with console log + Redis result, no Resend) → Tasks 7, 8, 9. ✓
- Pub/Sub (PUBLISH + SSE) → Tasks 10, 11. ✓
- Redis connection separation (normal/subscriber/BullMQ) → Task 2, used throughout. ✓
- Local Docker Redis, `REDIS_URL`, `ioredis` → Tasks 1, 2. ✓
- Infra ported (prettier, eslint, tsconfig, vitest, next config verbatim; package.json/gitignore/prettierignore/playwright/CI with edits; docker-compose new) → Tasks 1, 12. ✓
- CI Redis service container (the one structural CI difference) → Task 12. ✓
- Env fail-fast, constants, types → Task 1. ✓
- Testing strategy (real-Redis integration with prefix isolation, GitHub fixture test, negative-input tests, behavior assertions) → Tasks 3, 5, 7, 8, 11. ✓
- README → Task 12. ✓

**Type consistency:** `CachedRepoResult`, `RateLimitResult`, `JobSummary`/`JobData`/`JobResult`/`JobType`, `PubSubMessage` are defined once in `src/types/` and consumed by the same names downstream. `getJobQueue`/`enqueueJob`/`processJob`/`getJobState`/`listJobs`/`toJobSummary` names are consistent between the service task (7) and the route/UI tasks (8, 9). Browser wrapper `enqueueJob` (src/api) and service `enqueueJob` (src/services/queue) share a name but live in different layers and are imported by distinct paths — intentional, mirrors the chat-demo `api`/`services` split.

**Placeholder scan:** No TBD/TODO.

**Known runtime notes (not gaps):**

- `processJob` flaky logic keys on `job.attemptsMade`; with `JOB_ATTEMPTS = 3` the job fails on attempts 0 and 1, succeeds on attempt 2. If a BullMQ version reports `attemptsMade` differently, the threshold constant `FLAKY_SUCCESS_ATTEMPT` is the single place to adjust.
- The pub/sub subscriber stays subscribed across SSE clients by design (per-client unsubscribe only detaches that listener); acceptable for a single-instance demo.
