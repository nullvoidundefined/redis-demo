# Redis Patterns Demo (MVP) - Design Spec

Date: 2026-06-25
Status: Approved for planning
Author: brainstorming session (Ian + Claude)

## Purpose

An educational MVP that demonstrates the most common production uses of Redis in
a single Next.js application. The repo exists to teach, hands-on, how to wire and
when to reach for four Redis patterns: caching, rate limiting, background job
queues, and pub/sub. It is not a product.

It mirrors the chat-demo repo in shape, conventions, and infrastructure: one
Next.js App Router application, TypeScript, SCSS modules, Vitest, the same lint
and format tooling, the same CI shape. A reader who has seen chat-demo should
feel at home immediately.

Representative use: open the app, click into the Caching page, hit a button and
watch a slow GitHub API call return in ~2ms on the second try (cache HIT); open
the Rate Limit page and hammer a button until requests get 429'd; open the Queue
page, enqueue jobs and watch a separate worker process move them through
waiting -> active -> completed/failed with retries; open the Pub/Sub page and see
live messages stream into a ticker.

## Scope

In scope:

- Single Next.js application (App Router), TypeScript.
- A shared nav with one route per Redis pattern.
- Four demos: cache-aside caching, fixed-window rate limiting, a BullMQ job
  queue with a **separate worker process**, and pub/sub over SSE.
- Local Redis via Docker Compose (`redis:7`), reached over TCP with `ioredis`.
- The full chat-demo infrastructure ported over (see "Infrastructure ported from
  chat-demo").

Out of scope (listed so the omissions are explicit, not silent):

- No auth, no Postgres, no ORM. The only datastore is Redis.
- No email provider. The queue's "work" is a simulated task that console-logs and
  records a result in Redis; **no Resend, no external SaaS, no API keys** beyond
  the optional GitHub one (see Caching).
- No Playwright E2E suite in the MVP (the config and CI job are ported and
  wired, but writing the specs is a follow-up).
- No deploy pipeline in the MVP. Code targets a `REDIS_URL` connection string so
  the same code can later point at Upstash; that swap is documented, not built.
- Rate limiting keys on a client id from a header (or a generated id), not real
  authenticated IP identity.

## Decisions made during brainstorming

1. Redis is **local Docker Redis** (`redis:7`) over a TCP connection via
   `ioredis`, not a serverless/REST Redis. This is what makes BullMQ and pub/sub
   work fully and is the more instructive choice. A single `REDIS_URL` env keeps
   the door open to Upstash later.
2. Four patterns: **caching, rate limiting, job queue, pub/sub** (the user
   selected all four; the queue and pub/sub were the optional extras).
3. The caching demo caches a **real public API** (GitHub repo stats), not a
   simulated slow source. Real network latency makes the HIT/MISS story concrete,
   and unauthenticated GitHub is itself rate-limited, so caching has an obvious,
   real payoff.
4. The job queue uses **BullMQ with a separate worker process**
   (`npm run worker`). The job's work is a **simulated task** (console log + a
   result record written to Redis), **not** an email send. Resend was explicitly
   dropped. The full producer -> queue -> worker lifecycle, retries, and backoff
   are still taught; a deliberately-failing job type demonstrates failure/retry.
5. Pub/sub pushes messages to the browser over **SSE**, reusing the same SSE
   approach the team already knows from chat-demo.
6. **All chat-demo infrastructure is ported**: Prettier config, ESLint flat
   config, tsconfig, Vitest config, Playwright config, `.gitignore`,
   `.prettierignore`, the GitHub Actions CI workflow, and the npm script shape.
   Differences are only where Redis demands them (a Redis service in CI, a worker
   script, `ioredis`/`bullmq` deps instead of the Anthropic SDK).

## Stack

- Frontend/runtime: Next.js 16, App Router, TypeScript, React 19.
- UI: SCSS modules + Radix UI headless primitives (per project conventions).
- Redis client: `ioredis` (TCP), pointed at `REDIS_URL`. Chosen over `node-redis`
  because BullMQ uses `ioredis` under the hood, so the repo standardizes on one
  client library.
- Queue: `bullmq` (producer in the web app, consumer in a standalone worker).
- Validation: Zod for request-body validation on the write endpoints (ported
  dependency from chat-demo; one negative-input test per handler per R-208).
- Tests: Vitest (unit/component) plus **integration tests against a real test
  Redis** (per project convention: integration tests hit real infrastructure,
  not mocks), isolated by key prefix. Playwright config ported; specs deferred.
- Lint: ESLint flat config **ported verbatim from chat-demo**
  (`next/core-web-vitals`, security, jsx-a11y, react-hooks, unused-imports, and
  the "use SCSS modules not inline styles" rule), with `eslint-config-prettier`
  last.
- Format: Prettier config **ported verbatim from chat-demo** (4-space indent,
  100 print width, trailing commas, single quotes). Per the shared CLAUDE.md and
  global memory, the config file uses the `.mjs` extension.

## Architecture

One Next.js app, four feature pages, a thin API layer over a service layer, and
one standalone worker process. Five subsystems.

### Redis connections (the foundational seam)

Redis connection lifecycle lives in `clients/redis/`, one exported function per
file (R-235). A subtlety that is itself a teaching point: **a Redis connection in
subscriber mode cannot run normal commands**, and BullMQ wants its own
connection. So connections are explicit and separated, not one global client:

- `createRedisClient.ts` - builds an `ioredis` instance from `REDIS_URL`.
- `getRedisClient.ts` - the shared singleton for normal commands (cache, rate
  limit, queue producer reads).
- `getRedisSubscriber.ts` - a dedicated connection used only for pub/sub
  `subscribe`.
- `disconnectRedis.ts` - graceful shutdown (used by the worker and tests).

BullMQ is given its own connection per its requirements (a connection with
`maxRetriesPerRequest: null`), constructed in the queue service.

### 1. Caching (`/caching`)

Cache-aside over the GitHub repo API.

```
GET /api/cache/repo?name=<owner/repo>
  key = `cache:repo:${name}`
  cached = redis.get(key)
  if cached:  return { source: 'HIT',  data, ttl: redis.ttl(key) }   # ~2ms
  else:       data = fetch(`https://api.github.com/repos/${name}`)    # ~300-900ms
              redis.set(key, JSON, 'EX', CACHE_TTL_SECONDS)           # default 60
              return { source: 'MISS', data, ttl: CACHE_TTL_SECONDS }
DELETE /api/cache/repo?name=<owner/repo>   # invalidation: redis.del(key)
```

UI shows: HIT/MISS badge, measured round-trip latency for the call, a live TTL
countdown, the fetched repo data, and a "clear cache" button that calls DELETE.
The optional `GITHUB_TOKEN` raises the GitHub rate limit; absent, the demo still
works and the rate-limit angle becomes part of the lesson.

### 2. Rate limiting (`/rate-limit`)

Fixed-window limiter using `INCR` + `EXPIRE`.

```
POST /api/limited
  clientId = header 'x-client-id' or a generated id
  key = `ratelimit:${clientId}`
  count = redis.incr(key)
  if count == 1: redis.expire(key, WINDOW_SECONDS)        # default 10
  if count > MAX_REQUESTS:                                # default 10
     ttl = redis.ttl(key)
     return 429 with Retry-After: ttl, body { remaining: 0, resetIn: ttl }
  return 200 { remaining: MAX_REQUESTS - count, resetIn: redis.ttl(key) }
```

Fixed-window is chosen for teaching clarity (the simplest correct limiter); a
code comment notes sliding-window/token-bucket as the production-grade
alternatives and why. UI: a "send request" button (and a "spam 20" button),
a live remaining-count meter, the window reset countdown, and a visible 429 state
when blocked.

### 3. Job queue (`/queue`) + worker process

Producer in the web app, consumer in a standalone Node process.

```
POST /api/jobs    body { type: 'normal' | 'flaky', label }
  queue.add(JOB_NAME, { type, label }, { attempts: 3, backoff: { type:'exponential', delay:1000 } })
  return { jobId }

GET /api/jobs/:id   ->  { id, state, attemptsMade, returnvalue?, failedReason? }
GET /api/jobs       ->  recent jobs grouped by state (for the board)
```

The worker (`worker.ts`, a separate process, `npm run worker`):

```
new Worker(QUEUE_NAME, processJob, { connection })
processJob(job):
  log(`processing ${job.id} (${job.data.type})`)
  if job.data.type == 'flaky' and job.attemptsMade < 2: throw new Error('simulated failure')
  result = { processedAt, label: job.data.label }
  redis.set(`job:result:${job.id}`, JSON, 'EX', RESULT_TTL)   # so UI can show it
  return result
  # health endpoint on WORKER_PORT (3002) per project conventions
```

UI: a live job board (columns waiting / active / completed / failed) that polls
`GET /api/jobs`, an "enqueue normal job" and "enqueue flaky job" button, and
per-job detail showing `attemptsMade` so retries + exponential backoff are
visible. The flaky type fails twice then succeeds, demonstrating retry/backoff;
a permanently-failing variant could be added to show the failed column (noted,
not required for MVP).

### 4. Pub/Sub (`/pubsub`)

```
POST /api/pubsub/publish   body { message }   ->  redis.publish(CHANNEL, message)
GET  /api/pubsub/stream    ->  SSE; getRedisSubscriber().subscribe(CHANNEL);
                                on message -> write SSE 'data:' line to client
```

UI: a publish input + button, and a live ticker that appends each message
received over SSE. Demonstrates Redis beyond key-value, and contrasts pub/sub
(fire-and-forget, no persistence) with the queue (durable, retried) on the very
next page.

## Directory layout

```
redis-demo/
  docker-compose.yml                # redis:7, port 6379, named volume
  worker.ts                         # standalone BullMQ worker entry (separate process)
  src/
    app/
      layout.tsx                    # shared nav across the four demos
      page.tsx                      # landing: explains the four patterns, links out
      caching/page.tsx
      rate-limit/page.tsx
      queue/page.tsx
      pubsub/page.tsx
      api/
        cache/repo/route.ts         # GET (cache-aside) + DELETE (invalidate)
        limited/route.ts            # POST (rate-limited)
        jobs/route.ts               # POST enqueue, GET list
        jobs/[id]/route.ts          # GET job state
        pubsub/publish/route.ts     # POST publish
        pubsub/stream/route.ts      # GET SSE subscriber stream
    components/
      Nav/{Nav.tsx, Nav.module.scss}
      CacheDemo/   RateLimitDemo/   JobBoard/   PubSubTicker/
      <shared bits: Badge, LatencyMeter, Countdown as they earn reuse>
    state/
      useCountdown.ts               # TTL / reset countdown hook
      useJobBoard.ts                # polls GET /api/jobs
      usePubSubStream.ts            # opens the SSE stream, accumulates messages
    api/                            # browser fetch wrappers, one per route
      fetchCachedRepo.ts  clearCachedRepo.ts  sendLimitedRequest.ts
      enqueueJob.ts  fetchJob.ts  fetchJobs.ts  publishMessage.ts
    services/
      cache/getCachedRepo.ts  invalidateCachedRepo.ts
      rateLimit/checkRateLimit.ts
      queue/getJobQueue.ts  enqueueJob.ts  getJobState.ts  listJobs.ts  processJob.ts
      pubsub/publishMessage.ts  subscribeToChannel.ts
      sse/encodeSseEvent.ts         # event object -> SSE wire string (as in chat-demo)
    clients/
      redis/createRedisClient.ts  getRedisClient.ts  getRedisSubscriber.ts  disconnectRedis.ts
      github/getRepoStats.ts        # raw GitHub REST call, no cache knowledge
    config/                         # env loading (REDIS_URL required, GITHUB_TOKEN optional), fail-fast
    constants/                      # CACHE_TTL_SECONDS, WINDOW_SECONDS, MAX_REQUESTS, QUEUE_NAME, CHANNEL, ports
    types/                          # RepoStats, JobSummary, RateLimitResult, PubSubMessage
    __tests__/                      # mirrors src layout (R-239)
      setup.ts
      integration/                  # real test Redis, isolated key prefix
    __fixtures__/                   # captured GitHub repo JSON
  eslint.config.mjs                 # ported verbatim from chat-demo
  prettier.config.mjs               # ported verbatim from chat-demo
  .prettierignore  .gitignore  tsconfig.json  vitest.config.ts  next.config.ts
  playwright.config.ts              # ported; specs deferred
  .github/workflows/ci.yml          # ported + Redis service container
  .env.example                      # REDIS_URL=, GITHUB_TOKEN=, WORKER_PORT=
  README.md
  package.json
```

Convention notes: `clients/` is the raw provider/connection layer with no domain
knowledge; `services/` holds the business logic; route handlers and the worker
are thin orchestrators calling services (R-227). One exported function per file
across `services/`, `api/`, `clients/` (R-235). The Redis connection lifecycle
functions are split into separate files, never one `redis.ts` holding several
(R-235, called out explicitly in the rule). Tests live in `__tests__/` mirroring
source (R-239), never co-located. `db/` is never used; this repo has no SQL
database, and even Redis access stays under `clients/redis/` per the abbreviation
rule (R-229).

## Infrastructure ported from chat-demo

Ported **verbatim** (no demo-specific change needed):

- `prettier.config.mjs` - 4-space, 100-width, single quotes, trailing commas.
- `eslint.config.mjs` - the full flat config (next/core-web-vitals, security,
  jsx-a11y, react-hooks, unused-imports, no-inline-styles, prettier last).
- `tsconfig.json` - strict, bundler resolution, `@/*` path alias. (Next.js owns
  this file's formatting; it stays in `.prettierignore`.)
- `next.config.ts` - empty config object.
- `vitest.config.ts` - jsdom, globals, `@` alias, `src/__tests__/**/*.test.{ts,tsx}`.

Ported **with demo-specific edits**:

- `package.json` - same script shape (`dev`, `build`, `start`, `lint`, `format`,
  `format:check`, `test`, `test:watch`, `test:e2e`), Node 24 engine, `type:
module`. Add `"worker": "node --env-file-if-exists=.env --import tsx worker.ts"`.
  Dependencies: drop `@anthropic-ai/sdk`; add `ioredis` and `bullmq`. Keep
  `zod`, the React/Next/Radix/SCSS stack, and the entire devDependency lint/test
  toolchain identical.
- `.gitignore` / `.prettierignore` - same as chat-demo, minus the `evals/`
  entries (no eval harness here).
- `.env.example` - `REDIS_URL=redis://localhost:6379`, `GITHUB_TOKEN=`,
  `WORKER_PORT=3002`.
- `playwright.config.ts` - ported; its `webServer.env` carries `REDIS_URL`
  instead of the Anthropic/Tavily test keys. Specs are a follow-up, but the
  config and CI job are wired so adding them later is drop-in.
- `.github/workflows/ci.yml` - same two-job shape (`verify` = typecheck, lint,
  format:check, test, build; plus `e2e`). **Both jobs gain a Redis service
  container** (`services: redis: image: redis:7, ports: 6379`) and a
  `REDIS_URL` env, because the integration tests and the build/E2E need a live
  Redis. This is the one structural CI difference from chat-demo.

New infrastructure (no chat-demo equivalent):

- `docker-compose.yml` - `redis:7` on 6379 with a named volume, so local dev is
  `docker compose up -d` then `npm run dev` (+ `npm run worker` in a second
  terminal).

## Config and constants

`src/constants/` (R-219 - no magic numbers/strings):

```
CACHE_TTL_SECONDS   = 60
WINDOW_SECONDS      = 10
MAX_REQUESTS        = 10
QUEUE_NAME          = 'demo-jobs'
JOB_NAME            = 'process'
CHANNEL             = 'demo-events'
RESULT_TTL_SECONDS  = 300
WORKER_PORT         = Number(process.env.WORKER_PORT ?? 3002)
```

`config/` loads and validates env: `REDIS_URL` required (fail fast with a clear
message if missing), `GITHUB_TOKEN` optional (raises GitHub's rate limit when
present).

## Testing strategy

Follows global R-200: tests must fail when behavior is wrong; no self-mocks, no
tautologies, behavior assertions over call-count assertions. Per project
convention, integration tests hit a **real Redis**, not a mocked client.

- Cache service: integration test against real test Redis - first call is a MISS
  and populates the key; second call within TTL is a HIT; `invalidateCachedRepo`
  removes the key so the next call MISSes again. GitHub fetch is stubbed at the
  `clients/github` boundary (or `fetch`) so the test does not hit the network;
  one fixture test parses a **captured real GitHub repo JSON** under
  `__fixtures__/`.
- Rate limit service: integration test against real Redis - the Nth request
  inside the window is allowed and the (N+1)th is blocked with the right
  `resetIn`; after the window expires the count resets. One negative-input test
  per write handler (R-208): missing/oversized body.
- Queue: `enqueueJob` adds a job with the configured attempts/backoff;
  `processJob` returns a result for a normal job, throws for a flaky job on early
  attempts then succeeds, and writes the result record to Redis. Assertions are
  on job state and the stored result, not on mock call counts. Worker wiring is
  tested by driving `processJob` directly (the pure unit) plus an integration
  test that enqueues and drains via a real queue against test Redis.
- Pub/Sub: integration test - subscribe, publish, assert the subscriber receives
  the message; `encodeSseEvent` round-trips event object -> wire string ->
  parsed back (as in chat-demo).
- Route handlers: thin-orchestrator tests asserting they call the service and map
  results/status correctly (including the 429 path and `Retry-After`).
- Hooks/components: `useCountdown`, `useJobBoard`, `usePubSubStream`, and one
  component test per demo (render, interact, see state update) with a scripted
  fetch/SSE.
- Test isolation: integration tests use a unique key prefix per run and flush
  their prefix in teardown, never `FLUSHALL` on a shared instance.

## README

Ported in shape from chat-demo's README: what it does, setup, architecture,
the four patterns, tests. Setup section documents `docker compose up -d`,
`npm run dev`, `npm run worker`, and the optional `GITHUB_TOKEN`. A short note
explains the `REDIS_URL` -> Upstash swap as the path to deployment.

## Open follow-ups (post-MVP)

- Playwright E2E specs covering each demo's happy path, the 429 state, and the
  job lifecycle, plus keyboard nav and reduced-motion per project accessibility
  conventions (the config and CI job are already wired).
- Deploy pipeline pointing `REDIS_URL` at Upstash (note: BullMQ needs the TCP
  endpoint, not the REST-only free tier).
- Optional: swap fixed-window rate limiting for a sliding-window or token-bucket
  implementation as a comparison exercise.
- Optional: a Redis-backed session/store demo, or a leaderboard via sorted sets,
  if more patterns prove useful.

```

```
