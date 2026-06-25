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
});
