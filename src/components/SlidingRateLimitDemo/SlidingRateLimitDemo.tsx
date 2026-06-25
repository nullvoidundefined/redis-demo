/** Sliding-window rate-limit demo: fire requests at /api/sliding-limited and
 * watch the remaining budget fall to zero and flip to a blocked (429) state.
 * Uses a sorted-set window that slides continuously rather than resetting on
 * a fixed boundary. */
'use client';

import { useState } from 'react';
import { sendSlidingLimitedRequest } from '@/api/sendSlidingLimitedRequest';
import type { RateLimitResult } from '@/types/rateLimit';
import styles from './SlidingRateLimitDemo.module.scss';

const SPAM_COUNT = 15;

export function SlidingRateLimitDemo() {
    const [result, setResult] = useState<RateLimitResult | null>(null);
    const [blocked, setBlocked] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function sendOne() {
        try {
            setErrorMessage(null);
            const { status, result: next } = await sendSlidingLimitedRequest();
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
