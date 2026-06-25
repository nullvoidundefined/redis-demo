import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const sendLimitedRequest = vi.hoisted(() => vi.fn());
vi.mock('@/api/sendLimitedRequest', () => ({ sendLimitedRequest }));

import { RateLimitDemo } from '@/components/RateLimitDemo/RateLimitDemo';

describe('RateLimitDemo', () => {
    it('shows remaining on success and a blocked state on 429', async () => {
        sendLimitedRequest.mockResolvedValueOnce({
            status: 200,
            result: { allowed: true, remaining: 3, resetIn: 9 },
        });
        render(<RateLimitDemo />);
        fireEvent.click(screen.getByRole('button', { name: /send request/i }));
        await waitFor(() => expect(screen.getByText(/remaining: 3/i)).toBeInTheDocument());

        sendLimitedRequest.mockResolvedValueOnce({
            status: 429,
            result: { allowed: false, remaining: 0, resetIn: 7 },
        });
        fireEvent.click(screen.getByRole('button', { name: /send request/i }));
        await waitFor(() => expect(screen.getByText(/blocked/i)).toBeInTheDocument());
    });
});
