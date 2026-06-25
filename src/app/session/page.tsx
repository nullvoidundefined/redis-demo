/** Session-store demo page. */
import { SessionDemo } from '@/components/SessionDemo/SessionDemo';

export default function SessionPage() {
    return (
        <section>
            <h1>Session store (SET EX / GET / DEL)</h1>
            <p>
                Create a short-lived session with a label: the record is stored in Redis with a TTL.
                Read it back, watch the countdown, then destroy it to simulate logout.
            </p>
            <SessionDemo />
        </section>
    );
}
