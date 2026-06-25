/** Leaderboard demo page. */
import { Leaderboard } from '@/components/Leaderboard/Leaderboard';

export default function LeaderboardPage() {
    return (
        <section>
            <h1>Leaderboard (Sorted Set)</h1>
            <p>
                Submit scores and watch Redis maintain a real-time ranking using a sorted set
                (ZADD/ZREVRANGE). The highest score always rises to the top.
            </p>
            <Leaderboard />
        </section>
    );
}
