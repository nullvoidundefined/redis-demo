/** Shared type for a single leaderboard entry returned by the sorted-set demo. */
export type LeaderboardEntry = {
    name: string;
    score: number;
    rank: number;
};
