/** Session-store demo: create a short-lived session (SET EX), read it back with
 * its TTL countdown, refresh on demand, and destroy it (DEL). */
'use client';

import { useState } from 'react';
import { createSession } from '@/api/createSession';
import { destroySession } from '@/api/destroySession';
import { fetchSession } from '@/api/fetchSession';
import { useCountdown } from '@/state/useCountdown';
import type { SessionView } from '@/types/session';
import styles from './SessionDemo.module.scss';

export function SessionDemo() {
    const [label, setLabel] = useState('');
    const [sessionView, setSessionView] = useState<SessionView | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const ttl = useCountdown(sessionView?.ttl ?? 0);

    async function handleCreate() {
        try {
            setErrorMessage(null);
            const token = await createSession(label);
            const view = await fetchSession(token);
            setSessionView(view);
        } catch {
            setErrorMessage('Request failed. Is Redis running?');
        }
    }

    async function handleRefresh() {
        if (!sessionView) {
            return;
        }
        try {
            setErrorMessage(null);
            const view = await fetchSession(sessionView.token);
            setSessionView(view);
        } catch {
            setErrorMessage('Request failed. Is Redis running?');
        }
    }

    async function handleDestroy() {
        if (!sessionView) {
            return;
        }
        try {
            setErrorMessage(null);
            await destroySession(sessionView.token);
            setSessionView(null);
        } catch {
            setErrorMessage('Request failed. Is Redis running?');
        }
    }

    return (
        <div className={styles.panel}>
            <div className={styles.row}>
                <label htmlFor="session-label">Session label</label>
                <input
                    id="session-label"
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                />
                <button onClick={handleCreate}>Create session</button>
            </div>
            {errorMessage && (
                <p role="alert" className={styles.error}>
                    {errorMessage}
                </p>
            )}
            {sessionView && (
                <div>
                    <p>
                        Token: <code>{sessionView.token}</code>
                    </p>
                    <p>Label: {sessionView.data.label}</p>
                    <p>Created: {sessionView.data.createdAt}</p>
                    <p>TTL: {ttl}s</p>
                    <div className={styles.row}>
                        <button onClick={handleRefresh}>Refresh</button>
                        <button onClick={handleDestroy}>Destroy</button>
                    </div>
                </div>
            )}
        </div>
    );
}
