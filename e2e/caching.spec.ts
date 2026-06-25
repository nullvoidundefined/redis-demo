/** Caching demo E2E: fetch a GitHub repo, assert HIT/MISS appears with the repo
 * name, then clear the cache and assert the result panel is gone. */
import { expect, test } from '@playwright/test';

test.describe('Caching demo', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/caching');
    });

    test('page renders the caching heading', async ({ page }) => {
        await expect(
            page.getByRole('heading', { level: 1, name: 'Caching (cache-aside)' }),
        ).toBeVisible();
    });

    test('fetch returns a HIT or MISS badge with the repo name', async ({ page }) => {
        await page.getByRole('button', { name: 'Fetch' }).click();
        // The result paragraph shows either "HIT" or "MISS" followed by latency and TTL.
        await expect(page.getByText(/^(HIT|MISS)\s+-\s+\d+ms/)).toBeVisible({ timeout: 15_000 });
        // The full name of the default repo should appear.
        await expect(page.getByText(/redis\/redis/i)).toBeVisible({ timeout: 15_000 });
    });

    test('clear cache removes the result panel', async ({ page }) => {
        // Fetch first so there is something to clear.
        await page.getByRole('button', { name: 'Fetch' }).click();
        await expect(page.getByText(/^(HIT|MISS)\s+-\s+\d+ms/)).toBeVisible({ timeout: 15_000 });

        await page.getByRole('button', { name: 'Clear cache' }).click();
        await expect(page.getByText(/^(HIT|MISS)\s+-\s+\d+ms/)).not.toBeVisible();
    });
});
