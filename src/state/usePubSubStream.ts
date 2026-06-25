/** Opens the SSE stream and accumulates received messages newest-last. */
import { useEffect, useState } from 'react';

export function usePubSubStream(): string[] {
    const [messages, setMessages] = useState<string[]>([]);

    useEffect(() => {
        const source = new EventSource('/api/pubsub/stream');
        source.onmessage = (event) => {
            const { message } = JSON.parse(event.data);
            setMessages((current) => [...current, message]);
        };
        return () => source.close();
    }, []);

    return messages;
}
