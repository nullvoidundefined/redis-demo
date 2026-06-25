import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createSession = vi.hoisted(() => vi.fn());
const fetchSession = vi.hoisted(() => vi.fn());
const destroySession = vi.hoisted(() => vi.fn());
vi.mock('@/api/createSession', () => ({ createSession }));
vi.mock('@/api/fetchSession', () => ({ fetchSession }));
vi.mock('@/api/destroySession', () => ({ destroySession }));

import { SessionDemo } from '@/components/SessionDemo/SessionDemo';

const SESSION_VIEW = {
    token: 'tok-abc',
    data: { label: 'my-session', createdAt: '2024-01-01T00:00:00.000Z' },
    ttl: 1799,
};

describe('SessionDemo', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        createSession.mockResolvedValue('tok-abc');
        fetchSession.mockResolvedValue(SESSION_VIEW);
        destroySession.mockResolvedValue(undefined);
    });

    it('creates a session and shows the token and record', async () => {
        render(<SessionDemo />);
        fireEvent.change(screen.getByLabelText(/session label/i), {
            target: { value: 'my-session' },
        });
        fireEvent.click(screen.getByRole('button', { name: /create session/i }));
        await waitFor(() => expect(screen.getByText(/tok-abc/)).toBeInTheDocument());
        expect(screen.getByText(/my-session/)).toBeInTheDocument();
    });

    it('clears the state when Destroy is clicked', async () => {
        render(<SessionDemo />);
        fireEvent.change(screen.getByLabelText(/session label/i), {
            target: { value: 'my-session' },
        });
        fireEvent.click(screen.getByRole('button', { name: /create session/i }));
        await waitFor(() => expect(screen.getByText(/tok-abc/)).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: /destroy/i }));
        await waitFor(() => expect(screen.queryByText(/tok-abc/)).not.toBeInTheDocument());
    });

    it('shows an error alert when create fails', async () => {
        createSession.mockRejectedValueOnce(new Error('boom'));
        render(<SessionDemo />);
        fireEvent.change(screen.getByLabelText(/session label/i), {
            target: { value: 'fail-label' },
        });
        fireEvent.click(screen.getByRole('button', { name: /create session/i }));
        await screen.findByRole('alert');
        expect(screen.getByRole('alert')).toHaveTextContent('Request failed. Is Redis running?');
    });
});
