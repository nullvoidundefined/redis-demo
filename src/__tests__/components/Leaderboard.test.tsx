import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const submitScore = vi.hoisted(() => vi.fn());
const fetchLeaderboard = vi.hoisted(() => vi.fn());
vi.mock('@/api/submitScore', () => ({ submitScore }));
vi.mock('@/api/fetchLeaderboard', () => ({ fetchLeaderboard }));

import { Leaderboard } from '@/components/Leaderboard/Leaderboard';

const MOCK_ENTRIES = [
    { name: 'Alice', score: 900, rank: 1 },
    { name: 'Bob', score: 500, rank: 2 },
];

describe('Leaderboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fetchLeaderboard.mockResolvedValue(MOCK_ENTRIES);
    });

    it('renders ranked entries fetched on mount', async () => {
        render(<Leaderboard />);
        await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getByText('900')).toBeInTheDocument();
        expect(screen.getByText('500')).toBeInTheDocument();
        // rank column
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('calls submitScore then refreshes on form submit', async () => {
        submitScore.mockResolvedValueOnce(undefined);
        render(<Leaderboard />);
        await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Carol' } });
        fireEvent.change(screen.getByLabelText(/score/i), { target: { value: '750' } });
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));

        await waitFor(() => expect(submitScore).toHaveBeenCalledWith('Carol', 750));
        expect(fetchLeaderboard).toHaveBeenCalledTimes(2);
    });

    it('shows an error alert when submitScore throws', async () => {
        submitScore.mockRejectedValueOnce(new Error('Redis down'));
        render(<Leaderboard />);
        await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Dave' } });
        fireEvent.change(screen.getByLabelText(/score/i), { target: { value: '100' } });
        fireEvent.click(screen.getByRole('button', { name: /submit/i }));

        await screen.findByRole('alert');
        expect(screen.getByRole('alert')).toHaveTextContent('Submit failed. Is Redis running?');
    });
});
