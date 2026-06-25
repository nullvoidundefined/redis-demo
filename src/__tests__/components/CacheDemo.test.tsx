import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/api/fetchCachedRepo', () => ({
    fetchCachedRepo: vi.fn().mockResolvedValue({
        source: 'MISS',
        data: { fullName: 'redis/redis', stars: 5 },
        ttl: 60,
    }),
}));
vi.mock('@/api/clearCachedRepo', () => ({ clearCachedRepo: vi.fn().mockResolvedValue(undefined) }));

import { CacheDemo } from '@/components/CacheDemo/CacheDemo';

describe('CacheDemo', () => {
    it('fetches and shows the HIT/MISS source and repo data', async () => {
        render(<CacheDemo />);
        fireEvent.click(screen.getByRole('button', { name: /fetch/i }));
        await waitFor(() => expect(screen.getByText(/MISS/)).toBeInTheDocument());
        expect(screen.getByText(/redis\/redis/)).toBeInTheDocument();
    });
});
