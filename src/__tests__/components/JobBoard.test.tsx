import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/api/fetchJobs', () => ({
    fetchJobs: vi.fn().mockResolvedValue([
        {
            id: 'job-1',
            state: 'completed',
            type: 'normal',
            label: 'a',
            attemptsMade: 1,
            returnValue: null,
            failedReason: null,
        },
        {
            id: 'job-2',
            state: 'failed',
            type: 'flaky',
            label: 'b',
            attemptsMade: 3,
            returnValue: null,
            failedReason: 'boom',
        },
    ]),
}));
vi.mock('@/api/enqueueJob', () => ({ enqueueJob: vi.fn().mockResolvedValue('job-3') }));

import { JobBoard } from '@/components/JobBoard/JobBoard';

describe('JobBoard', () => {
    it('renders jobs grouped by state', async () => {
        render(<JobBoard />);
        await waitFor(() => expect(screen.getByText('job-1')).toBeInTheDocument());
        expect(screen.getByText('job-2')).toBeInTheDocument();
        expect(screen.getByText(/boom/)).toBeInTheDocument();
    });
});
