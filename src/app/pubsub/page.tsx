/** Pub/Sub demo page. */
import { PubSubTicker } from '@/components/PubSubTicker/PubSubTicker';

export default function PubSubPage() {
    return (
        <section>
            <h1>Pub/Sub (live feed)</h1>
            <p>
                Publish a message; it streams to every open tab over SSE. Open two tabs to see it.
            </p>
            <PubSubTicker />
        </section>
    );
}
