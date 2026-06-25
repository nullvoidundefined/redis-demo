# Redis Patterns Demo (educational MVP)

A single Next.js app demonstrating four common production uses of Redis:
caching, rate limiting, a background job queue, and pub/sub.

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
  `pubsub/`, `sse/`.
- `src/app/api/` - thin route handlers that call services.
- `worker.ts` - standalone BullMQ worker process (health endpoint on 3002).

## Tests

`npm test` runs the Vitest suite. Integration tests under
`src/__tests__/integration/` hit a real Redis, so `docker compose up -d` must be
running first. They isolate by key prefix and never flush the database.

## Deployment

Code targets a single `REDIS_URL`, so deploying means pointing it at a hosted
Redis (e.g. Upstash). Note: BullMQ needs the TCP endpoint, not a REST-only tier.
