/** Polls GET /api/leaderboard on an interval so the board reflects new scores. */
import { useCallback, useEffect, useState } from 'react';
import { fetchLeaderboard } from '@/api/fetchLeaderboard';
import type { LeaderboardEntry } from '@/types/leaderboard';

const POLL_INTERVAL_MS = 2000;

export function useLeaderboard() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

    const refresh = useCallback(async () => {
        const updatedEntries = await fetchLeaderboard();
        setEntries(updatedEntries);
    }, []);

    useEffect(() => {
        async function loadEntries() {
            await refresh();
        }
        void loadEntries();
        const interval = setInterval(() => void refresh(), POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [refresh]);

    return { entries, refresh };
}
