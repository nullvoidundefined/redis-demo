import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/state/usePubSubStream', () => ({
    usePubSubStream: () => [
        { id: 1, text: 'first' },
        { id: 2, text: 'second' },
    ],
}));
const publishMessage = vi.hoisted(() => vi.fn());
vi.mock('@/api/publishMessage', () => ({ publishMessage }));

import { PubSubTicker } from '@/components/PubSubTicker/PubSubTicker';

describe('PubSubTicker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        publishMessage.mockResolvedValue(undefined);
    });

    it('renders streamed messages and publishes new ones', async () => {
        render(<PubSubTicker />);
        expect(screen.getByText('first')).toBeInTheDocument();
        expect(screen.getByText('second')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'hey' } });
        fireEvent.click(screen.getByRole('button', { name: /publish/i }));
        await waitFor(() => expect(publishMessage).toHaveBeenCalledWith('hey'));
        await waitFor(() => expect(screen.getByLabelText(/message/i)).toHaveValue(''));
    });

    it('shows an error alert when the publish request fails', async () => {
        publishMessage.mockRejectedValueOnce(new Error('boom'));
        render(<PubSubTicker />);
        fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'hey' } });
        fireEvent.click(screen.getByRole('button', { name: /publish/i }));
        await screen.findByRole('alert');
        expect(screen.getByRole('alert')).toHaveTextContent('Request failed. Is Redis running?');
    });
});
