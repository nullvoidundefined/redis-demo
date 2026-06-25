/** Browser wrapper for GET /api/leaderboard. */
import type { LeaderboardEntry } from '@/types/leaderboard';

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    const response = await fetch('/api/leaderboard');
    if (!response.ok) {
        throw new Error(`Fetch leaderboard failed: ${response.status}`);
    }
    return response.json() as Promise<LeaderboardEntry[]>;
}
