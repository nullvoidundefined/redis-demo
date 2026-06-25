/** Rate-limit demo E2E: spam the fixed-window and sliding-window limiters until
 * they return a BLOCKED (429) state. Each limiter allows 10 requests per 10 s,
 * so 15 requests is enough to trigger a block in a fresh window. */
import { expect, test } from '@playwright/test';

test.describe('Rate Limit demo - fixed window', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/rate-limit');
    });

    test('page renders the rate-limiting heading', async ({ page }) => {
        await expect(page.getByRole('heading', { level: 1, name: 'Rate Limiting' })).toBeVisible();
        await expect(page.getByRole('heading', { level: 2, name: 'Fixed window' })).toBeVisible();
        await expect(page.getByRole('heading', { level: 2, name: 'Sliding window' })).toBeVisible();
    });

    test('spamming the fixed-window button triggers a BLOCKED state', async ({ page }) => {
        // The fixed-window RateLimitDemo is the first panel; its Spam 15 button spams 15 times.
        // Both panels share the same button text so locate by first occurrence.
        const spamButtons = page.getByRole('button', { name: 'Spam 15' });
        await spamButtons.first().click();
        // After 15 rapid requests against a 10-req/10s window, at least the final
        // ones should be blocked. Wait up to 20 s for all sequential awaits to complete.
        await expect(page.getByText('BLOCKED (429)')).toBeVisible({ timeout: 20_000 });
    });
});

test.describe('Rate Limit demo - sliding window', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/rate-limit');
    });

    test('spamming the sliding-window button triggers a BLOCKED state', async ({ page }) => {
        // The sliding-window panel is the second panel on the page.
        const spamButtons = page.getByRole('button', { name: 'Spam 15' });
        await spamButtons.last().click();
        await expect(page.getByText('BLOCKED (429)')).toBeVisible({ timeout: 20_000 });
    });
});
