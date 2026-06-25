import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchCachedRepo = vi.hoisted(() => vi.fn());
const clearCachedRepo = vi.hoisted(() => vi.fn());
vi.mock('@/api/fetchCachedRepo', () => ({ fetchCachedRepo }));
vi.mock('@/api/clearCachedRepo', () => ({ clearCachedRepo }));

import { CacheDemo } from '@/components/CacheDemo/CacheDemo';

describe('CacheDemo', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fetchCachedRepo.mockResolvedValue({
            source: 'MISS',
            data: { fullName: 'redis/redis', stars: 5 },
            ttl: 60,
        });
        clearCachedRepo.mockResolvedValue(undefined);
    });

    it('fetches and shows the HIT/MISS source and repo data', async () => {
        render(<CacheDemo />);
        fireEvent.click(screen.getByRole('button', { name: /fetch/i }));
        await waitFor(() => expect(screen.getByText(/MISS/)).toBeInTheDocument());
        expect(screen.getByText(/redis\/redis/)).toBeInTheDocument();
    });

    it('clears the result panel when Clear cache is clicked', async () => {
        render(<CacheDemo />);
        fireEvent.click(screen.getByRole('button', { name: /fetch/i }));
        await waitFor(() => expect(screen.getByText(/MISS/)).toBeInTheDocument());
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /clear cache/i }));
        });
        expect(clearCachedRepo).toHaveBeenCalled();
        expect(screen.queryByText(/MISS/)).not.toBeInTheDocument();
        expect(screen.queryByText(/redis\/redis/)).not.toBeInTheDocument();
    });

    it('shows an error alert when the fetch request fails', async () => {
        fetchCachedRepo.mockRejectedValueOnce(new Error('boom'));
        render(<CacheDemo />);
        fireEvent.click(screen.getByRole('button', { name: /fetch/i }));
        await screen.findByRole('alert');
        expect(screen.getByRole('alert')).toHaveTextContent('Request failed. Is Redis running?');
    });
});
