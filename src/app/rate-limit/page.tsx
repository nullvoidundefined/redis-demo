/** Rate-limit demo page. */
import { RateLimitDemo } from '@/components/RateLimitDemo/RateLimitDemo';

export default function RateLimitPage() {
    return (
        <section>
            <h1>Rate Limiting (fixed window)</h1>
            <p>
                Up to 10 requests per 10s window. Beyond that you get a 429 until the window resets.
            </p>
            <RateLimitDemo />
        </section>
    );
}
