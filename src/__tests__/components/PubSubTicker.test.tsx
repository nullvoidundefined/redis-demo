import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/state/usePubSubStream', () => ({ usePubSubStream: () => ['first', 'second'] }));
const { publishMessage } = vi.hoisted(() => ({
    publishMessage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/api/publishMessage', () => ({ publishMessage }));

import { PubSubTicker } from '@/components/PubSubTicker/PubSubTicker';

describe('PubSubTicker', () => {
    it('renders streamed messages and publishes new ones', async () => {
        render(<PubSubTicker />);
        expect(screen.getByText('first')).toBeInTheDocument();
        expect(screen.getByText('second')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'hey' } });
        fireEvent.click(screen.getByRole('button', { name: /publish/i }));
        await waitFor(() => expect(publishMessage).toHaveBeenCalledWith('hey'));
        await waitFor(() => expect(screen.getByLabelText(/message/i)).toHaveValue(''));
    });
});
