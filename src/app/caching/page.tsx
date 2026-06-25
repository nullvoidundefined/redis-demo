/** Caching demo page. */
import { CacheDemo } from '@/components/CacheDemo/CacheDemo';

export default function CachingPage() {
    return (
        <section>
            <h1>Caching (cache-aside)</h1>
            <p>
                First fetch is a MISS (slow GitHub call); the next is a HIT until the TTL expires.
            </p>
            <CacheDemo />
        </section>
    );
}
