/** Reads the top-N leaderboard entries, highest score first, with 1-based rank. */
import { getRedisClient } from '@/clients/redis/getRedisClient';
import { LEADERBOARD_KEY, LEADERBOARD_TOP_N } from '@/constants/leaderboard';
import type { LeaderboardEntry } from '@/types/leaderboard';

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
    const flat = await getRedisClient().zrevrange(
        LEADERBOARD_KEY,
        0,
        LEADERBOARD_TOP_N - 1,
        'WITHSCORES',
    );
    const entries: LeaderboardEntry[] = [];
    for (let i = 0; i < flat.length; i += 2) {
        entries.push({ name: flat[i], score: Number(flat[i + 1]), rank: i / 2 + 1 });
    }
    return entries;
}
