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

    test('publishing an empty message does not add a ticker entry', async ({ page }) => {
        // The component guards against empty draft in handlePublish (returns early).
        // Clicking with an empty input should not add any entry to the ticker.
        const ticker = page.getByTestId('ticker-message');
        const countBefore = await ticker.count();

        await page.getByRole('button', { name: 'Publish' }).click();

        await expect(ticker).toHaveCount(countBefore);
    });
});
