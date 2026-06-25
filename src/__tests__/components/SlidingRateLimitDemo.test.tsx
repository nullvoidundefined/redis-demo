import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendSlidingLimitedRequest = vi.hoisted(() => vi.fn());
vi.mock('@/api/sendSlidingLimitedRequest', () => ({ sendSlidingLimitedRequest }));

import { SlidingRateLimitDemo } from '@/components/SlidingRateLimitDemo/SlidingRateLimitDemo';

describe('SlidingRateLimitDemo', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows remaining on success and a blocked state on 429', async () => {
        sendSlidingLimitedRequest.mockResolvedValueOnce({
            status: 200,
            result: { allowed: true, remaining: 3, resetIn: 9 },
        });
        render(<SlidingRateLimitDemo />);
        fireEvent.click(screen.getByRole('button', { name: /send request/i }));
        await waitFor(() => expect(screen.getByText(/remaining: 3/i)).toBeInTheDocument());

        sendSlidingLimitedRequest.mockResolvedValueOnce({
            status: 429,
            result: { allowed: false, remaining: 0, resetIn: 7 },
        });
        fireEvent.click(screen.getByRole('button', { name: /send request/i }));
        await waitFor(() => expect(screen.getByText(/blocked/i)).toBeInTheDocument());
    });

    it('shows an error alert when the request fails', async () => {
        sendSlidingLimitedRequest.mockRejectedValueOnce(new Error('boom'));
        render(<SlidingRateLimitDemo />);
        fireEvent.click(screen.getByRole('button', { name: /send request/i }));
        await screen.findByRole('alert');
        expect(screen.getByRole('alert')).toHaveTextContent('Request failed. Is Redis running?');
    });
});
