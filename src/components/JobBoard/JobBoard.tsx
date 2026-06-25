/** Queue demo: enqueue normal/flaky jobs and watch them move through the
 * waiting / active / completed / failed columns as the worker processes them. */
'use client';

import { enqueueJob } from '@/api/enqueueJob';
import { useJobBoard } from '@/state/useJobBoard';
import type { JobSummary } from '@/types/job';
import styles from './JobBoard.module.scss';

const COLUMNS: { state: string; title: string }[] = [
    { state: 'waiting', title: 'Waiting' },
    { state: 'active', title: 'Active' },
    { state: 'completed', title: 'Completed' },
    { state: 'failed', title: 'Failed' },
];

export function JobBoard() {
    const { jobs, refresh } = useJobBoard();

    async function add(type: 'normal' | 'flaky') {
        await enqueueJob(type, `${type}-${jobs.length + 1}`);
        await refresh();
    }

    return (
        <div>
            <div className={styles.controls}>
                <button onClick={() => add('normal')}>Enqueue normal job</button>
                <button onClick={() => add('flaky')}>Enqueue flaky job</button>
            </div>
            <div className={styles.board}>
                {COLUMNS.map((column) => (
                    <div key={column.state} className={styles.column}>
                        <h3>{column.title}</h3>
                        {jobs
                            .filter((job) => matchesColumn(job, column.state))
                            .map((job) => (
                                <div key={job.id} className={styles.job}>
                                    <div>{job.id}</div>
                                    <div>
                                        {job.type} · attempts {job.attemptsMade}
                                    </div>
                                    {job.failedReason && <div>{job.failedReason}</div>}
                                </div>
                            ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

function matchesColumn(job: JobSummary, state: string): boolean {
    if (state === 'waiting') {
        return job.state === 'waiting' || job.state === 'delayed';
    }
    return job.state === state;
}
