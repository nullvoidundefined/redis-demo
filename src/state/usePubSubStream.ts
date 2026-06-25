/** Opens the SSE stream and accumulates received messages newest-last. */
import { useEffect, useRef, useState } from 'react';
import type { PubSubMessage } from '@/types/pubsubMessage';

export type StreamMessage = {
    id: number;
    text: string;
};

export function usePubSubStream(): StreamMessage[] {
    const [messages, setMessages] = useState<StreamMessage[]>([]);
    const nextId = useRef(0);

    useEffect(() => {
        const source = new EventSource('/api/pubsub/stream');
        source.onmessage = (event) => {
            const { message } = JSON.parse(event.data) as PubSubMessage;
            setMessages((current) => [...current, { id: nextId.current++, text: message }]);
        };
        return () => source.close();
    }, []);

    return messages;
}
