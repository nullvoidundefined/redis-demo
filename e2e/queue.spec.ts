/** Queue demo E2E: enqueue jobs and assert they appear on the board.
 *
 * NOTE: Playwright's webServer config starts only the Next.js production server,
 * NOT the BullMQ worker process (that requires `npm run worker` in a separate
 * terminal). As a result, enqueued jobs will never reach the Completed or Failed
 * columns during E2E. These specs only assert that a job is accepted (the job
 * type appears in the Waiting column) - completion is NOT asserted. */
import { expect, test } from '@playwright/test';

test.describe('Queue (BullMQ) demo', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/queue');
    });

    test('page renders the job queue heading', async ({ page }) => {
        await expect(
            page.getByRole('heading', { level: 1, name: 'Job Queue (BullMQ)' }),
        ).toBeVisible();
    });

    test('board columns render Waiting, Active, Completed, Failed headings', async ({ page }) => {
        await expect(page.getByRole('heading', { level: 3, name: 'Waiting' })).toBeVisible();
        await expect(page.getByRole('heading', { level: 3, name: 'Active' })).toBeVisible();
        await expect(page.getByRole('heading', { level: 3, name: 'Completed' })).toBeVisible();
        await expect(page.getByRole('heading', { level: 3, name: 'Failed' })).toBeVisible();
    });

    test('enqueue normal job - type and attempts appear on the board', async ({ page }) => {
        await page.getByRole('button', { name: 'Enqueue normal job' }).click();
        // The board renders "normal · attempts N" for each job in the Waiting or Active column.
        // Worker is not running during E2E, so the job stays in Waiting state.
        // Use .first() because previous test runs may have left existing jobs on the board.
        await expect(page.getByText(/normal\s*·\s*attempts/).first()).toBeVisible({
            timeout: 10_000,
        });
    });

    test('enqueue flaky job - type and attempts appear on the board', async ({ page }) => {
        await page.getByRole('button', { name: 'Enqueue flaky job' }).click();
        // The board renders "flaky · attempts N" for each job in the Waiting or Active column.
        // Use .first() because previous test runs may have left existing jobs on the board.
        await expect(page.getByText(/flaky\s*·\s*attempts/).first()).toBeVisible({
            timeout: 10_000,
        });
    });
});
