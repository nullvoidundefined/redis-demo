/** Rate-limit demo: fire requests at /api/limited and watch the remaining budget
 * fall to zero and flip to a blocked (429) state. */
'use client';

import { useState } from 'react';
import { sendLimitedRequest } from '@/api/sendLimitedRequest';
import type { RateLimitResult } from '@/types/rateLimit';
import styles from './RateLimitDemo.module.scss';

const SPAM_COUNT = 15;

export function RateLimitDemo() {
    const [result, setResult] = useState<RateLimitResult | null>(null);
    const [blocked, setBlocked] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function sendOne() {
        try {
            setErrorMessage(null);
            const { status, result: next } = await sendLimitedRequest();
            setResult(next);
            setBlocked(status === 429);
        } catch {
            setErrorMessage('Request failed. Is Redis running?');
        }
    }

    async function spam() {
        for (let i = 0; i < SPAM_COUNT; i += 1) {
            await sendOne();
        }
    }

    return (
        <div className={styles.panel}>
            <button onClick={sendOne}>Send request</button>
            <button onClick={spam}>Spam {SPAM_COUNT}</button>
            {errorMessage && (
                <p role="alert" className={styles.error}>
                    {errorMessage}
                </p>
            )}
            {result && (
                <p className={blocked ? styles.blocked : undefined}>
                    {blocked ? 'BLOCKED (429)' : 'OK'} - remaining: {result.remaining} - reset in{' '}
                    {result.resetIn}s
                </p>
            )}
        </div>
    );
}
