# Redis Patterns Demo - Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Extend the completed Redis demo with three new pattern demos (sliding-window rate limiting, sorted-set leaderboard, session store), a full Playwright E2E suite with accessibility checks, and minor polish (UI error states, test hygiene). No deploy (local educational demo only).

**Architecture:** Same as phase 1. `clients/redis` connections -> `services/<domain>` business logic (one exported function per file) -> thin route handlers + `api/` browser wrappers -> SCSS-module client components. Integration tests hit real Redis; component/route tests mock the boundary. Mirror the existing committed files as exemplars.

**Tech Stack:** Next.js 16, React 19, TypeScript, ioredis, bullmq, zod, Vitest, Playwright (+ @axe-core/playwright), SCSS modules.

## Global Constraints

- NEVER the em dash character (U+2014) anywhere (code, comments, JSX, markdown, commit messages). A hook hard-blocks it. Use hyphens/colons/periods.
- One exported function per file across `services/`, `api/`, `clients/`. File-level `/** */` header on every non-test source file (not test files, not JSON fixtures, not SCSS).
- No magic strings/numbers: extract to `src/constants/`. No inline `style={{}}` (eslint blocks it); style via `.module.scss`. Inputs need an associated `<label>`. Real `<button>` elements.
- `'use client';` on interactive components and EventSource/timer hooks. Mock pattern in tests: `vi.hoisted(() => ...)` + `vi.mock(...)` (plain `const fn = vi.fn()` before `vi.mock` throws).
- Integration tests hit REAL Redis (never a mocked client), isolate by key prefix (use `process.pid`), clean up their keys in `beforeEach`/`afterAll` (never FLUSHALL). `src/__tests__/setup.ts` defaults `REDIS_URL`, so `npx vitest run` works with local Redis up.
- React effects: do not call `setState` directly in an effect body (project lints `react-hooks/set-state-in-effect` as error); wrap in a named async function that the effect calls, mirroring `useJobBoard`/`useCountdown`.
- Every task: `npx vitest run` all green, `npx tsc --noEmit` 0 errors, `npm run lint` 0 warnings (fix warnings, never eslint-disable), `npm run format:check` passes (run `npm run format` on new files BEFORE committing). Do not commit `.env`. Do not run docker (Redis is local).
- After adding a demo page, update `src/components/Nav/Nav.tsx`, the landing page `src/app/page.tsx`, and `README.md`.

---

### Task 13: Minor polish (UI error states, test hygiene, stable keys)

**Files:**
- Modify: `src/components/CacheDemo/CacheDemo.tsx`, `src/components/RateLimitDemo/RateLimitDemo.tsx`, `src/components/PubSubTicker/PubSubTicker.tsx`
- Modify: `src/state/usePubSubStream.ts`
- Modify tests: `src/__tests__/components/CacheDemo.test.tsx`, `RateLimitDemo.test.tsx`, `PubSubTicker.test.tsx`

**Interfaces:**
- `usePubSubStream(): Array<{ id: number; text: string }>` (changed from `string[]` to give stable keys).

- [ ] **Step 1: Add error state to each interactive component**

For `CacheDemo`, `RateLimitDemo`, `PubSubTicker`: add a `const [errorMessage, setErrorMessage] = useState<string | null>(null);`. Wrap each async handler body in `try { ... setErrorMessage(null); } catch { setErrorMessage('Request failed. Is Redis running?'); }`. Render the error in a styled element (add a `.error` class to each `.module.scss` using `color: var(--error)`) with `role="alert"` when `errorMessage` is set. Keep all existing behavior; only add the catch + render.

- [ ] **Step 2: Stable keys in PubSubTicker**

Change `src/state/usePubSubStream.ts` to accumulate `{ id, text }` objects. Use a module-or-ref counter for `id` (monotonic), e.g. a `useRef(0)` incremented per message (do NOT use Date.now for the key source of truth; a ref counter is deterministic). Update the effect's message handler:
```ts
const nextId = useRef(0);
// in handler:
const { message } = JSON.parse(event.data) as { message: string };
setMessages((current) => [...current, { id: nextId.current++, text: message }]);
```
Update `PubSubTicker.tsx` to render `messages.map((m) => <div key={m.id} ...>{m.text}</div>)`.

- [ ] **Step 3: Update the three component tests**

- Add `beforeEach(() => { vi.clearAllMocks(); });` to `CacheDemo.test.tsx` and `RateLimitDemo.test.tsx` (and `PubSubTicker.test.tsx` if missing).
- `PubSubTicker.test.tsx`: the `usePubSubStream` mock must now return `[{ id: 1, text: 'first' }, { id: 2, text: 'second' }]`; assertions on `first`/`second` text stay valid.
- Add one error-path test per component: make the mocked api wrapper reject (`mockRejectedValueOnce(new Error('boom'))`), trigger the action, and assert the `role="alert"` error text appears (`await screen.findByRole('alert')`).

- [ ] **Step 4: Verify and commit**

Run `npx vitest run && npx tsc --noEmit && npm run lint && npm run format:check`. Then:
```bash
git add -A && git commit -m "feat: add UI error states, stable pubsub keys, and test cleanup"
```

---

### Task 14: Sliding-window rate limiter

**Files:**
- Create: `src/constants/slidingRateLimit.ts`, `src/services/rateLimit/checkSlidingRateLimit.ts`, `src/app/api/sliding-limited/route.ts`, `src/api/sendSlidingLimitedRequest.ts`, `src/components/SlidingRateLimitDemo/SlidingRateLimitDemo.tsx` + `.module.scss`
- Modify: `src/app/rate-limit/page.tsx` (render both demos with explanatory headings)
- Test: `src/__tests__/integration/slidingRateLimit.test.ts`, `src/__tests__/app/api/slidingLimited.test.ts`, `src/__tests__/components/SlidingRateLimitDemo.test.tsx`

**Interfaces:**
- Consumes `getRedisClient`, `RateLimitResult` (`{ allowed, remaining, resetIn }`).
- Produces `checkSlidingRateLimit(clientId: string): Promise<RateLimitResult>`; `POST /api/sliding-limited` -> 200 or 429 + `Retry-After`; `sendSlidingLimitedRequest(): Promise<{ status: number; result: RateLimitResult }>`.

- [ ] **Step 1: Constants**

`src/constants/slidingRateLimit.ts`:
```ts
/** Sliding-window rate limiter tuning and key namespace. */
export const SLIDING_WINDOW_SECONDS = 10;
export const SLIDING_MAX_REQUESTS = 10;
export const SLIDING_KEY_PREFIX = 'ratelimit:slide:';
```

- [ ] **Step 2: Failing integration test**

`src/__tests__/integration/slidingRateLimit.test.ts` (`// @vitest-environment node`): key on `process.pid`, clean up in beforeEach/afterAll. Fire `SLIDING_MAX_REQUESTS` requests, assert the last is `allowed: true, remaining: 0`; the next is `allowed: false, resetIn > 0`. Assert behavior against real Redis.

- [ ] **Step 3: Run it, verify it fails**

`REDIS_URL=redis://localhost:6379 npx vitest run src/__tests__/integration/slidingRateLimit.test.ts` -> FAIL (module missing).

- [ ] **Step 4: Implement the sliding-window service**

`src/services/rateLimit/checkSlidingRateLimit.ts`:
```ts
/** Sliding-window rate limiter using a Redis sorted set: each request is a member
 * scored by timestamp; expired entries are evicted before counting, so the window
 * slides continuously instead of resetting in fixed blocks (more accurate at edges
 * than the fixed-window limiter, at the cost of more memory per client). */
import { randomUUID } from 'node:crypto';
import { getRedisClient } from '@/clients/redis/getRedisClient';
import {
    SLIDING_KEY_PREFIX,
    SLIDING_MAX_REQUESTS,
    SLIDING_WINDOW_SECONDS,
} from '@/constants/slidingRateLimit';
import type { RateLimitResult } from '@/types/rateLimit';

const MILLISECONDS_PER_SECOND = 1000;

export async function checkSlidingRateLimit(clientId: string): Promise<RateLimitResult> {
    const redis = getRedisClient();
    const key = `${SLIDING_KEY_PREFIX}${clientId}`;
    const now = Date.now();
    const windowMs = SLIDING_WINDOW_SECONDS * MILLISECONDS_PER_SECOND;
    const windowStart = now - windowMs;

    await redis.zremrangebyscore(key, 0, windowStart);
    await redis.zadd(key, now, `${now}:${randomUUID()}`);
    await redis.expire(key, SLIDING_WINDOW_SECONDS);
    const count = await redis.zcard(key);

    const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
    const oldestScore = oldest.length === 2 ? Number(oldest[1]) : now;
    const resetIn = Math.max(1, Math.ceil((oldestScore + windowMs - now) / MILLISECONDS_PER_SECOND));

    if (count > SLIDING_MAX_REQUESTS) {
        return { allowed: false, remaining: 0, resetIn };
    }
    return { allowed: true, remaining: SLIDING_MAX_REQUESTS - count, resetIn };
}
```

- [ ] **Step 5: Run it, verify it passes**

`REDIS_URL=redis://localhost:6379 npx vitest run src/__tests__/integration/slidingRateLimit.test.ts` -> PASS.

- [ ] **Step 6: Route + browser wrapper (mirror `/api/limited` and `sendLimitedRequest`)**

`src/app/api/sliding-limited/route.ts`: POST, clientId from `x-client-id` header (fallback `'anonymous'`), call `checkSlidingRateLimit`, return 200 or 429 + `Retry-After`. `src/api/sendSlidingLimitedRequest.ts`: mirror `sendLimitedRequest` but POST to `/api/sliding-limited`. Write the route test `slidingLimited.test.ts` mirroring `limited.test.ts` (200 path full body + 429 path with `Retry-After`), using `vi.hoisted`. RED then GREEN.

- [ ] **Step 7: UI + integrate into the rate-limit page**

`src/components/SlidingRateLimitDemo/SlidingRateLimitDemo.tsx` (+ `.module.scss`): mirror `RateLimitDemo` (send button, spam button, remaining/blocked display, error state per Task 13 pattern) calling `sendSlidingLimitedRequest`. Component test mirrors `RateLimitDemo.test.tsx` (success + 429 + error). Update `src/app/rate-limit/page.tsx` to render both, each under a heading: "Fixed window" and "Sliding window", with a one-line description of the tradeoff. RED then GREEN for the component test.

- [ ] **Step 8: Verify and commit**

`npx vitest run && npx tsc --noEmit && npm run lint && npm run format:check`, then:
```bash
git add -A && git commit -m "feat: add sliding-window rate limiter demo (sorted set)"
```

---

### Task 15: Sorted-set leaderboard

**Files:**
- Create: `src/constants/leaderboard.ts`, `src/types/leaderboard.ts`, `src/services/leaderboard/submitScore.ts`, `src/services/leaderboard/getLeaderboard.ts`, `src/app/api/leaderboard/route.ts`, `src/api/submitScore.ts`, `src/api/fetchLeaderboard.ts`, `src/state/useLeaderboard.ts`, `src/components/Leaderboard/Leaderboard.tsx` + `.module.scss`, `src/app/leaderboard/page.tsx`
- Modify: `src/components/Nav/Nav.tsx`, `src/app/page.tsx`, `README.md`
- Test: `src/__tests__/integration/leaderboard.test.ts`, `src/__tests__/app/api/leaderboard.test.ts`, `src/__tests__/components/Leaderboard.test.tsx`

**Interfaces:**
- `LeaderboardEntry = { name: string; score: number; rank: number }`.
- `submitScore(name: string, score: number): Promise<void>` (ZADD).
- `getLeaderboard(): Promise<LeaderboardEntry[]>` (ZREVRANGE top N WITHSCORES, rank = index + 1).
- `POST /api/leaderboard` `{ name, score }` -> `{ submitted: true }` (400 invalid); `GET /api/leaderboard` -> `LeaderboardEntry[]`.
- `submitScore(name, score): Promise<void>`, `fetchLeaderboard(): Promise<LeaderboardEntry[]>` (browser); `useLeaderboard(): { entries, refresh }`.

- [ ] **Step 1: Constants + type**

`src/constants/leaderboard.ts`:
```ts
/** Leaderboard demo: the sorted-set key and how many top entries to show. */
export const LEADERBOARD_KEY = 'leaderboard:demo';
export const LEADERBOARD_TOP_N = 10;
```
`src/types/leaderboard.ts`:
```ts
export type LeaderboardEntry = {
    name: string;
    score: number;
    rank: number;
};
```

- [ ] **Step 2: Failing integration test**

`src/__tests__/integration/leaderboard.test.ts` (`// @vitest-environment node`): IMPORTANT - to isolate from the shared `LEADERBOARD_KEY`, the test should `del(LEADERBOARD_KEY)` in beforeEach/afterAll (this is a shared demo key, acceptable to clear in the test since it is demo data; note this in a comment). Submit three scores, assert `getLeaderboard()` returns them ordered high-to-low with correct `rank` (1,2,3) and scores. Real Redis.

- [ ] **Step 3: Run it, verify it fails.** `REDIS_URL=redis://localhost:6379 npx vitest run src/__tests__/integration/leaderboard.test.ts` -> FAIL.

- [ ] **Step 4: Implement the services**

`src/services/leaderboard/submitScore.ts`:
```ts
/** Records a player's score in the leaderboard sorted set (higher score ranks higher). */
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { LEADERBOARD_KEY } from '@/constants/leaderboard';

export async function submitScore(name: string, score: number): Promise<void> {
    await getRedisClient().zadd(LEADERBOARD_KEY, score, name);
}
```
`src/services/leaderboard/getLeaderboard.ts`:
```ts
/** Reads the top-N leaderboard entries, highest score first, with 1-based rank. */
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { LEADERBOARD_KEY, LEADERBOARD_TOP_N } from '@/constants/leaderboard';
import type { LeaderboardEntry } from '@/types/leaderboard';

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
    const flat = await getRedisClient().zrevrange(LEADERBOARD_KEY, 0, LEADERBOARD_TOP_N - 1, 'WITHSCORES');
    const entries: LeaderboardEntry[] = [];
    for (let i = 0; i < flat.length; i += 2) {
        entries.push({ name: flat[i], score: Number(flat[i + 1]), rank: i / 2 + 1 });
    }
    return entries;
}
```

- [ ] **Step 5: Run it, verify it passes.** -> PASS.

- [ ] **Step 6: Route + browser wrappers**

`src/app/api/leaderboard/route.ts`: POST validates `{ name: z.string().min(1).max(40), score: z.number().int() }` (400 on invalid; one negative-input test), calls `submitScore`, returns `{ submitted: true }`. GET returns `getLeaderboard()`. Browser wrappers `submitScore.ts` (POST) and `fetchLeaderboard.ts` (GET) mirror the queue wrappers. Route test `leaderboard.test.ts` mirrors `jobs.test.ts` (POST happy + invalid, GET list shape), `vi.hoisted`. RED then GREEN.

- [ ] **Step 7: Hook + UI + nav/landing**

`src/state/useLeaderboard.ts`: poll `fetchLeaderboard` on a 2000ms interval, expose `{ entries, refresh }` (mirror `useJobBoard`, named-async-function-in-effect pattern). `src/components/Leaderboard/Leaderboard.tsx` (+ `.module.scss`, `'use client'`): a labeled name input + number score input + submit button (calls browser `submitScore` then `refresh`), and a ranked table of `entries` (rank, name, score). Error state per Task 13. Component test mocks `@/api/submitScore` + `@/api/fetchLeaderboard` (or the hook), asserts rendered ranking + submit calls. Add a "Leaderboard" link to `Nav.tsx` and a bullet to the landing page. RED then GREEN.

- [ ] **Step 8: README + verify + commit**

Add the Leaderboard demo to `README.md`'s demo list. `npx vitest run && npx tsc --noEmit && npm run lint && npm run format:check`, then:
```bash
git add -A && git commit -m "feat: add sorted-set leaderboard demo"
```

---

### Task 16: Session store

**Files:**
- Create: `src/constants/session.ts`, `src/types/session.ts`, `src/services/session/createSession.ts`, `src/services/session/getSession.ts`, `src/services/session/destroySession.ts`, `src/app/api/session/route.ts` (POST create + GET-needs-token... see below), `src/app/api/session/[token]/route.ts` (GET + DELETE), `src/api/createSession.ts`, `src/api/fetchSession.ts`, `src/api/destroySession.ts`, `src/components/SessionDemo/SessionDemo.tsx` + `.module.scss`, `src/app/session/page.tsx`
- Modify: `src/components/Nav/Nav.tsx`, `src/app/page.tsx`, `README.md`
- Test: `src/__tests__/integration/session.test.ts`, `src/__tests__/app/api/session.test.ts`, `src/__tests__/components/SessionDemo.test.tsx`

**Interfaces:**
- `SessionRecord = { label: string; createdAt: string }`; `SessionView = { token: string; data: SessionRecord; ttl: number }`.
- `createSession(label: string): Promise<string>` (returns a `randomUUID` token; `SET session:<token> json EX SESSION_TTL_SECONDS`).
- `getSession(token: string): Promise<SessionView | null>` (GET + parse + `ttl`; null if absent).
- `destroySession(token: string): Promise<void>` (DEL).
- `POST /api/session` `{ label }` -> `{ token }` (400 invalid); `GET /api/session/:token` -> `SessionView` or 404; `DELETE /api/session/:token` -> `{ destroyed: true }`.
- Browser: `createSession(label): Promise<string>`, `fetchSession(token): Promise<SessionView>`, `destroySession(token): Promise<void>`.

- [ ] **Step 1: Constants + types**

`src/constants/session.ts`:
```ts
/** Session-store demo: key namespace and session lifetime. */
export const SESSION_KEY_PREFIX = 'session:';
export const SESSION_TTL_SECONDS = 1800;
```
`src/types/session.ts`:
```ts
export type SessionRecord = {
    label: string;
    createdAt: string;
};

export type SessionView = {
    token: string;
    data: SessionRecord;
    ttl: number;
};
```

- [ ] **Step 2: Failing integration test**

`src/__tests__/integration/session.test.ts` (`// @vitest-environment node`): create a session (capture token), `getSession` returns the record with `ttl > 0`; `destroySession` then `getSession` returns null. Clean up the created `session:<token>` key in afterAll. Real Redis.

- [ ] **Step 3: Run it, verify it fails.** -> FAIL.

- [ ] **Step 4: Implement services**

`createSession.ts`:
```ts
/** Creates a session: stores a small record under a random token with a TTL,
 * returns the token (the SET EX / GET / DEL lifecycle is the teaching point). */
import { randomUUID } from 'node:crypto';
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { SESSION_KEY_PREFIX, SESSION_TTL_SECONDS } from '@/constants/session';
import type { SessionRecord } from '@/types/session';

export async function createSession(label: string): Promise<string> {
    const token = randomUUID();
    const record: SessionRecord = { label, createdAt: new Date().toISOString() };
    await getRedisClient().set(
        `${SESSION_KEY_PREFIX}${token}`,
        JSON.stringify(record),
        'EX',
        SESSION_TTL_SECONDS,
    );
    return token;
}
```
`getSession.ts`:
```ts
/** Reads a session record and its remaining TTL, or null if it has expired/never existed. */
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { SESSION_KEY_PREFIX } from '@/constants/session';
import type { SessionRecord, SessionView } from '@/types/session';

export async function getSession(token: string): Promise<SessionView | null> {
    const redis = getRedisClient();
    const key = `${SESSION_KEY_PREFIX}${token}`;
    const raw = await redis.get(key);
    if (!raw) {
        return null;
    }
    const data = JSON.parse(raw) as SessionRecord;
    return { token, data, ttl: await redis.ttl(key) };
}
```
`destroySession.ts`:
```ts
/** Destroys a session by deleting its key (logout). */
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { SESSION_KEY_PREFIX } from '@/constants/session';

export async function destroySession(token: string): Promise<void> {
    await getRedisClient().del(`${SESSION_KEY_PREFIX}${token}`);
}
```

- [ ] **Step 5: Run it, verify it passes.** -> PASS.

- [ ] **Step 6: Routes + browser wrappers**

`src/app/api/session/route.ts`: POST validates `{ label: z.string().min(1).max(60) }` (400 invalid; one negative test), `createSession`, returns `{ token }`. `src/app/api/session/[token]/route.ts`: GET returns `getSession(token)` or 404; DELETE calls `destroySession`, returns `{ destroyed: true }` (params is `Promise<{ token: string }>`, awaited). Browser wrappers mirror the jobs wrappers. Route test `session.test.ts` mirrors `jobs.test.ts` (POST happy + invalid, GET 200 + 404), `vi.hoisted`. RED then GREEN.

- [ ] **Step 7: UI + nav/landing**

`src/components/SessionDemo/SessionDemo.tsx` (+ `.module.scss`, `'use client'`): labeled label-input + "Create session" button (calls browser `createSession`, stores returned token in state, then `fetchSession` to show record + TTL countdown via `useCountdown`), a "Refresh" to re-read, and a "Destroy" button (calls `destroySession`, clears state). Error state per Task 13. Component test mocks the three `@/api/...` session wrappers; asserts create -> token/record shown, destroy -> cleared. Add "Session" to `Nav.tsx` + landing bullet. RED then GREEN.

- [ ] **Step 8: README + verify + commit**

Add Session demo to `README.md`. `npx vitest run && npx tsc --noEmit && npm run lint && npm run format:check`, then:
```bash
git add -A && git commit -m "feat: add session-store demo (SET EX / GET / DEL)"
```

---

### Task 17: Playwright E2E suite + accessibility

**Files:**
- Create: `e2e/caching.spec.ts`, `e2e/rateLimit.spec.ts`, `e2e/queue.spec.ts`, `e2e/pubsub.spec.ts`, `e2e/leaderboard.spec.ts`, `e2e/session.spec.ts`, `e2e/accessibility.spec.ts`
- Modify: `e2e/smoke.spec.ts` may stay as-is; `README.md` (note `npm run test:e2e` covers the demos)

**Interfaces:** none (specs run against the prod build started by `playwright.config.ts`'s webServer, with `REDIS_URL` set; CI's redis service provides Redis).

- [ ] **Step 1: Per-demo happy-path + error specs**

Write one spec per demo. Each navigates to the route and asserts the core happy path against the REAL running app + Redis:
- `caching.spec.ts`: go to `/caching`, click Fetch, assert a HIT or MISS badge appears and the repo name renders; click "Clear cache", assert the result panel clears.
- `rateLimit.spec.ts`: go to `/rate-limit`, click the fixed-window "Spam" button, assert a BLOCKED/429 state eventually appears (the window is 10/10s, so spamming 15 triggers it). Do the same for the sliding-window demo section.
- `queue.spec.ts`: go to `/queue`, click "Enqueue normal job", assert a job id appears in the board (in Waiting or Active). NOTE: the Playwright webServer starts only Next.js, NOT the BullMQ worker, so jobs will NOT complete during E2E. Assert only that the job is enqueued and appears on the board; do NOT assert completion. Add a code comment stating this.
- `pubsub.spec.ts`: go to `/pubsub`, type a message, click Publish, assert it appears in the ticker (SSE round-trip through the real server).
- `leaderboard.spec.ts`: go to `/leaderboard`, submit a name + score, assert the entry appears in the ranked table.
- `session.spec.ts`: go to `/session`, create a session, assert a token/record appears; destroy it, assert it clears.

Each spec uses role-based locators (`getByRole`) and `expect(...).toBeVisible()`. Keep selectors resilient (match the actual rendered text/roles - read the components first).

- [ ] **Step 2: Accessibility spec (axe)**

`e2e/accessibility.spec.ts` using `@axe-core/playwright` (already a devDependency):
```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ROUTES = ['/', '/caching', '/rate-limit', '/queue', '/pubsub', '/leaderboard', '/session'];

for (const route of ROUTES) {
    test(`no detectable accessibility violations on ${route}`, async ({ page }) => {
        await page.goto(route);
        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze();
        expect(results.violations).toEqual([]);
    });
}
```
If axe reports real violations, FIX the underlying component (semantic HTML, labels, contrast, one h1 per page, heading order) rather than weakening the assertion. Document any fix in the report.

- [ ] **Step 3: Run the full E2E suite locally**

Ensure local Redis is up. Run `npx playwright install chromium` (if needed) then `REDIS_URL=redis://localhost:6379 npx playwright test`. All specs must pass. Iterate on selectors/a11y until green. (This builds + starts the prod app via the webServer config.)

- [ ] **Step 4: Update README + final full verification**

Note in `README.md` that `npm run test:e2e` runs the Playwright suite (needs Redis up + a prod build; the worker is not started, so the queue E2E asserts enqueue only). Then run the COMPLETE gate set:
```
npx tsc --noEmit
npm run lint
npm run format:check
npx vitest run
npm run build
REDIS_URL=redis://localhost:6379 npx playwright test
```
All must pass. Report each result.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "test(e2e): add per-demo and accessibility Playwright specs"
```

---

## Self-Review

**Spec coverage of the requested optional items:**
- Minor polish (UI error states, test hygiene, stable pubsub keys) -> Task 13. ✓
- Sliding-window rate limiter -> Task 14. ✓
- Sorted-set leaderboard -> Task 15. ✓
- Session store -> Task 16. ✓
- Full Playwright E2E suite + accessibility -> Task 17. ✓
- Deploy -> intentionally OUT (local educational demo; confirmed with user). ✓

**Type consistency:** `RateLimitResult` reused for sliding window (same shape). New types `LeaderboardEntry`, `SessionRecord`/`SessionView` defined once in `src/types/` and consumed by their services/routes/UI. Browser wrapper names (`submitScore`, `createSession`, etc.) intentionally mirror service names across the `api/` vs `services/` layers (established pattern).

**Placeholder scan:** none. New-pattern services give full code; boilerplate (routes/wrappers/UI) references the exact existing exemplar files to mirror, which the implementer can read.

**Known notes (not gaps):**
- Leaderboard and the demo session use shared keys; integration tests clear those demo keys (acceptable - demo data, documented in the tests).
- Queue E2E cannot assert job completion because Playwright's webServer does not start the BullMQ worker; specs assert enqueue/appearance only (documented in the spec and README).
- `randomUUID` / `Date.now` / `new Date` are used in app/service code (allowed; the restriction is only for workflow scripts).
