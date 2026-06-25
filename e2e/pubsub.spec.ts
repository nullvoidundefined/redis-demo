/** Pub/Sub demo E2E: type a message, click Publish, and assert it appears in the
 * SSE ticker. The round-trip goes through the real Redis pub/sub channel. */
import { expect, test } from '@playwright/test';

test.describe('Pub/Sub demo', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/pubsub');
    });

    test('page renders the pub/sub heading', async ({ page }) => {
        await expect(
            page.getByRole('heading', { level: 1, name: 'Pub/Sub (live feed)' }),
        ).toBeVisible();
    });

    test('published message appears in the ticker', async ({ page }) => {
        const uniqueMessage = `e2e-test-${Date.now()}`;

        await page.getByLabel('Message').fill(uniqueMessage);
        await page.getByRole('button', { name: 'Publish' }).click();

        // The message travels from the browser to the API route, through Redis pub/sub,
        // and back to the browser over SSE. Allow a generous timeout for the round-trip.
        await expect(page.getByText(uniqueMessage)).toBeVisible({ timeout: 10_000 });
    });

    test('publish button is disabled-by-behaviour when message is empty', async ({ page }) => {
        // The component guards against empty draft in handlePublish (returns early).
        // Clicking with an empty input should not add any entry to the ticker.
        const tickerLocator = page.locator('.message');
        const countBefore = await tickerLocator.count();

        await page.getByRole('button', { name: 'Publish' }).click();

        // Wait a moment then assert no new message appeared.
        await page.waitForTimeout(500);
        const countAfter = await tickerLocator.count();
        expect(countAfter).toBe(countBefore);
    });
});
