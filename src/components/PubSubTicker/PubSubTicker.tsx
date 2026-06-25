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

    async function handlePublish() {
        if (!draft) {
            return;
        }
        await publishMessage(draft);
        setDraft('');
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
            <div className={styles.ticker}>
                {messages.map((message, index) => (
                    <div key={index} className={styles.message}>
                        {message}
                    </div>
                ))}
            </div>
        </div>
    );
}
