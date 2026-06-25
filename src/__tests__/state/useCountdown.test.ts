import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCountdown } from '@/state/useCountdown';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useCountdown', () => {
    it('counts down to zero one second at a time', () => {
        const { result } = renderHook(() => useCountdown(3));
        expect(result.current).toBe(3);
        act(() => void vi.advanceTimersByTime(2000));
        expect(result.current).toBe(1);
        act(() => void vi.advanceTimersByTime(5000));
        expect(result.current).toBe(0);
    });

    it('resets to the new value when seconds input changes', () => {
        const { result, rerender } = renderHook(({ s }) => useCountdown(s), {
            initialProps: { s: 5 },
        });
        act(() => void vi.advanceTimersByTime(2000));
        expect(result.current).toBe(3);
        rerender({ s: 10 });
        expect(result.current).toBe(10);
        act(() => void vi.advanceTimersByTime(1000));
        expect(result.current).toBe(9);
    });
});
