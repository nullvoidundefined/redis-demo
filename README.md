# Redis Patterns Demo (educational MVP)

A single Next.js app demonstrating six common production uses of Redis:
caching, rate limiting, a background job queue, pub/sub, leaderboards, and session storage.

## What it does

- **Caching** (`/caching`) - cache-aside over the GitHub repo API. First fetch is
  a MISS (slow); the next is a HIT until the TTL expires. Includes invalidation.
- **Rate limiting** (`/rate-limit`) - fixed-window limiter (10 req / 10s). Spam
  the button and watch requests get 429'd with a reset countdown.
- **Queue** (`/queue`) - BullMQ jobs processed by a separate worker, with retries
  and exponential backoff. Flaky jobs fail twice then succeed.
- **Pub/Sub** (`/pubsub`) - publish a message and watch it stream live to every
  open tab over SSE.
- **Leaderboard** (`/leaderboard`) - submit scores into a sorted set (ZADD) and
  watch ZREVRANGE keep the ranking up to date, highest score first.
- **Session store** (`/session`) - create a short-lived session (SET EX), read it
  back with a live TTL countdown, and destroy it (DEL) to simulate logout.

## Setup

1. `npm install`
2. `docker compose up -d` (starts Redis on 6379)
3. Copy `.env.example` to `.env` (defaults work for local Redis). `GITHUB_TOKEN`
   is optional and raises GitHub's rate limit.
4. `npm run dev` - open http://localhost:3000
5. In a second terminal: `npm run worker` (required for the Queue demo)

## Architecture

- `src/clients/redis/` - ioredis connections: a shared command client, a
  dedicated subscriber (a subscribed connection can't run normal commands), and
  per-queue BullMQ connections.
- `src/clients/github/` - raw GitHub REST call.
- `src/services/` - the business logic: `cache/`, `rateLimit/`, `queue/`,
  `pubsub/`, `sse/`, `session/`.
- `src/app/api/` - thin route handlers that call services.
- `worker.ts` - standalone BullMQ worker process (health endpoint on 3002).

## Tests

`npm test` runs the Vitest unit and integration suite. Integration tests under
`src/__tests__/integration/` hit a real Redis, so `docker compose up -d` must be
running first. They isolate by key prefix and never flush the database.

`npm run test:e2e` runs the Playwright E2E suite. Prerequisites:

- Redis must be running (`docker compose up -d` or `REDIS_URL=redis://localhost:6379`).
- A production build is auto-created by the Playwright web-server config before
  tests run (`npm run build && npm run start`).
- The BullMQ **worker is not started** by the Playwright web-server. Queue E2E
  specs only assert that a job is enqueued and appears on the board (Waiting state);
  they do not assert job completion.

Run the full E2E suite:

```
REDIS_URL=redis://localhost:6379 npx playwright test
```

## Deployment

Code targets a single `REDIS_URL`, so deploying means pointing it at a hosted
Redis (e.g. Upstash). Note: BullMQ needs the TCP endpoint, not a REST-only tier.
