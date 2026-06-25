/** Polls GET /api/jobs on an interval so the board reflects worker progress. */
import { useCallback, useEffect, useState } from 'react';
import { fetchJobs } from '@/api/fetchJobs';
import type { JobSummary } from '@/types/job';

const POLL_INTERVAL_MS = 1000;

export function useJobBoard() {
    const [jobs, setJobs] = useState<JobSummary[]>([]);

    const refresh = useCallback(async () => {
        const updatedJobs = await fetchJobs();
        setJobs(updatedJobs);
    }, []);

    useEffect(() => {
        async function loadJobs() {
            await refresh();
        }
        void loadJobs();
        const interval = setInterval(() => void refresh(), POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [refresh]);

    return { jobs, refresh };
}
