/** Landing page: explains the four Redis patterns demonstrated by this app. */
export default function HomePage() {
    return (
        <section>
            <h1>Redis Patterns Demo</h1>
            <p>Four common production uses of Redis, each on its own page:</p>
            <ul>
                <li>
                    <strong>Caching</strong> - cache-aside over the GitHub API with TTL and
                    invalidation.
                </li>
                <li>
                    <strong>Rate limiting</strong> - fixed-window limiter with INCR + EXPIRE.
                </li>
                <li>
                    <strong>Queue</strong> - BullMQ jobs processed by a separate worker, with
                    retries and backoff.
                </li>
                <li>
                    <strong>Pub/Sub</strong> - live messages streamed to the browser over SSE.
                </li>
                <li>
                    <strong>Leaderboard</strong> - sorted-set ranking with ZADD and ZREVRANGE,
                    highest score always at the top.
                </li>
            </ul>
        </section>
    );
}
