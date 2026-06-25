/** Leaderboard demo: submit scores and watch the sorted-set ranking update in real time. */
'use client';

import { useState } from 'react';
import { submitScore } from '@/api/submitScore';
import { useLeaderboard } from '@/state/useLeaderboard';
import styles from './Leaderboard.module.scss';

export function Leaderboard() {
    const { entries, refresh, errorMessage: loadErrorMessage } = useLeaderboard();
    const [name, setName] = useState('');
    const [score, setScore] = useState('');
    const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);

    const visibleError = submitErrorMessage ?? loadErrorMessage;

    async function handleSubmit() {
        try {
            setSubmitErrorMessage(null);
            await submitScore(name.trim(), Number(score));
            setName('');
            setScore('');
            await refresh();
        } catch {
            setSubmitErrorMessage('Submit failed. Is Redis running?');
        }
    }

    return (
        <div className={styles.panel}>
            <div className={styles.form}>
                <label htmlFor="leaderboard-name">Name</label>
                <input
                    id="leaderboard-name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Player name"
                    maxLength={40}
                />
                <label htmlFor="leaderboard-score">Score</label>
                <input
                    id="leaderboard-score"
                    type="number"
                    value={score}
                    onChange={(event) => setScore(event.target.value)}
                    placeholder="0"
                />
                <button onClick={handleSubmit}>Submit score</button>
            </div>
            {visibleError && (
                <p role="alert" className={styles.error}>
                    {visibleError}
                </p>
            )}
            {entries.length > 0 && (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Name</th>
                            <th>Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((entry) => (
                            <tr key={entry.rank}>
                                <td>{entry.rank}</td>
                                <td>{entry.name}</td>
                                <td>{entry.score}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
