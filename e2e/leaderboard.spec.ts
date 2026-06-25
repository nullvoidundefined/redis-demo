/** Leaderboard demo E2E: submit a name + score and assert the entry appears in
 * the ranked table using Redis sorted-set operations (ZADD / ZREVRANGE). */
import { expect, test } from '@playwright/test';

test.describe('Leaderboard demo', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/leaderboard');
    });

    test('page renders the leaderboard heading', async ({ page }) => {
        await expect(
            page.getByRole('heading', { level: 1, name: 'Leaderboard (Sorted Set)' }),
        ).toBeVisible();
    });

    test('submitting a name and score shows the entry in the table', async ({ page }) => {
        const playerName = `E2EPlayer${Date.now()}`;
        const playerScore = '9999';

        await page.getByLabel('Name').fill(playerName);
        await page.getByLabel('Score').fill(playerScore);
        await page.getByRole('button', { name: 'Submit score' }).click();

        // The table with Rank / Name / Score columns should appear and contain the entry.
        await expect(page.getByRole('table')).toBeVisible({ timeout: 10_000 });
        // playerName is unique (timestamp-based), so exactly one cell should match.
        await expect(page.getByRole('cell', { name: playerName })).toBeVisible({ timeout: 10_000 });
        // playerScore may appear in multiple rows from prior test runs; use first() to avoid
        // strict-mode violation while still confirming the score value is present in the table.
        await expect(page.getByRole('cell', { name: playerScore }).first()).toBeVisible({
            timeout: 10_000,
        });
    });

    test('table headers are Rank, Name, Score', async ({ page }) => {
        // Submit one entry to make the table render.
        await page.getByLabel('Name').fill('TestPlayer');
        await page.getByLabel('Score').fill('1');
        await page.getByRole('button', { name: 'Submit score' }).click();

        await expect(page.getByRole('columnheader', { name: 'Rank' })).toBeVisible({
            timeout: 10_000,
        });
        await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible({
            timeout: 10_000,
        });
        await expect(page.getByRole('columnheader', { name: 'Score' })).toBeVisible({
            timeout: 10_000,
        });
    });
});
