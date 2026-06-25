/** Polls GET /api/leaderboard on an interval so the board reflects new scores. */
import { useCallback, useEffect, useState } from 'react';
import { fetchLeaderboard } from '@/api/fetchLeaderboard';
import type { LeaderboardEntry } from '@/types/leaderboard';

const POLL_INTERVAL_MS = 2000;

export function useLeaderboard() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        const updatedEntries = await fetchLeaderboard();
        setEntries(updatedEntries);
        setErrorMessage(null);
    }, []);

    useEffect(() => {
        async function loadEntries() {
            try {
                await refresh();
            } catch {
                setErrorMessage('Could not load the leaderboard. Is Redis running?');
            }
        }
        void loadEntries();
        const interval = setInterval(() => void loadEntries(), POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [refresh]);

    return { entries, refresh, errorMessage };
}
