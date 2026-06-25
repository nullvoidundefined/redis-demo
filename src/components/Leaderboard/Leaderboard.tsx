/** Leaderboard demo: submit scores and watch the sorted-set ranking update in real time. */
'use client';

import { useState } from 'react';
import { submitScore } from '@/api/submitScore';
import { useLeaderboard } from '@/state/useLeaderboard';
import styles from './Leaderboard.module.scss';

export function Leaderboard() {
    const { entries, refresh } = useLeaderboard();
    const [name, setName] = useState('');
    const [score, setScore] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function handleSubmit() {
        try {
            setErrorMessage(null);
            await submitScore(name.trim(), Number(score));
            setName('');
            setScore('');
            await refresh();
        } catch {
            setErrorMessage('Submit failed. Is Redis running?');
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
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Player name"
                    maxLength={40}
                />
                <label htmlFor="leaderboard-score">Score</label>
                <input
                    id="leaderboard-score"
                    type="number"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="0"
                />
                <button onClick={handleSubmit}>Submit score</button>
            </div>
            {errorMessage && (
                <p role="alert" className={styles.error}>
                    {errorMessage}
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
                            <tr key={entry.name}>
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
