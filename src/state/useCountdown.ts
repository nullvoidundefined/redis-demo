/** Ticks a second-by-second countdown from a starting value, resetting whenever
 * the input changes. Used for cache TTL and rate-limit reset displays. */
import { useEffect, useState } from 'react';

export function useCountdown(seconds: number): number {
    const [startedAt, setStartedAt] = useState(seconds);
    const [remaining, setRemaining] = useState(seconds);

    if (startedAt !== seconds) {
        setStartedAt(seconds);
        setRemaining(seconds);
    }

    useEffect(() => {
        if (seconds <= 0) {
            return;
        }
        const interval = setInterval(() => {
            setRemaining((current) => (current <= 1 ? 0 : current - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [seconds]);

    return remaining;
}
