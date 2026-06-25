/** Queue demo page. */
import { JobBoard } from '@/components/JobBoard/JobBoard';

export default function QueuePage() {
    return (
        <section>
            <h1>Job Queue (BullMQ)</h1>
            <p>
                Enqueue jobs and watch a separate worker process them. Flaky jobs fail twice, then
                succeed on retry (exponential backoff). Run <code>npm run worker</code> in a second
                terminal.
            </p>
            <JobBoard />
        </section>
    );
}
