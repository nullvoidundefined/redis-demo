/** Rate-limit demo page: shows a fixed-window and a sliding-window limiter
 * side-by-side to illustrate the edge-accuracy tradeoff. */
import { RateLimitDemo } from '@/components/RateLimitDemo/RateLimitDemo';
import { SlidingRateLimitDemo } from '@/components/SlidingRateLimitDemo/SlidingRateLimitDemo';

export default function RateLimitPage() {
    return (
        <section>
            <h1>Rate Limiting</h1>

            <h2>Fixed window</h2>
            <p>
                Simple INCR counter per window: fast and memory-efficient, but a burst at the window
                edge can double the effective rate.
            </p>
            <RateLimitDemo />

            <h2>Sliding window</h2>
            <p>
                Sorted-set log of timestamps: accurate at every instant, but uses more memory per
                client than the fixed-window approach.
            </p>
            <SlidingRateLimitDemo />
        </section>
    );
}
