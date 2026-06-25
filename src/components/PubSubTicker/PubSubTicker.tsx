/** Pub/Sub demo: publish a message and watch it (and messages from other tabs)
 * arrive live over an SSE stream. */
'use client';

import { useState } from 'react';
import { publishMessage } from '@/api/publishMessage';
import { usePubSubStream } from '@/state/usePubSubStream';
import styles from './PubSubTicker.module.scss';

export function PubSubTicker() {
    const messages = usePubSubStream();
    const [draft, setDraft] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function handlePublish() {
        if (!draft) {
            return;
        }
        try {
            setErrorMessage(null);
            await publishMessage(draft);
            setDraft('');
        } catch {
            setErrorMessage('Request failed. Is Redis running?');
        }
    }

    return (
        <div className={styles.panel}>
            <div className={styles.row}>
                <label htmlFor="message">Message</label>
                <input
                    id="message"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                />
                <button onClick={handlePublish}>Publish</button>
            </div>
            {errorMessage && (
                <p role="alert" className={styles.error}>
                    {errorMessage}
                </p>
            )}
            <div className={styles.ticker}>
                {messages.map((m) => (
                    <div key={m.id} className={styles.message}>
                        {m.text}
                    </div>
                ))}
            </div>
        </div>
    );
}
