/** Session-store demo E2E: create a session, assert the token and label appear,
 * then destroy it and assert the record clears. Covers Redis SET EX / GET / DEL. */
import { expect, test } from '@playwright/test';

test.describe('Session store demo', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/session');
    });

    test('page renders the session store heading', async ({ page }) => {
        await expect(
            page.getByRole('heading', { level: 1, name: 'Session store (SET EX / GET / DEL)' }),
        ).toBeVisible();
    });

    test('create session shows token and label', async ({ page }) => {
        const sessionLabel = `e2e-session-${Date.now()}`;

        await page.getByLabel('Session label').fill(sessionLabel);
        await page.getByRole('button', { name: 'Create session' }).click();

        // After creation the token (a UUID) and the label are rendered.
        await expect(page.getByText(/Token:/)).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(sessionLabel)).toBeVisible({ timeout: 10_000 });
        // TTL countdown should be present.
        await expect(page.getByText(/TTL:/)).toBeVisible({ timeout: 10_000 });
    });

    test('destroy session clears the record', async ({ page }) => {
        const sessionLabel = `e2e-destroy-${Date.now()}`;

        await page.getByLabel('Session label').fill(sessionLabel);
        await page.getByRole('button', { name: 'Create session' }).click();
        await expect(page.getByText(/Token:/)).toBeVisible({ timeout: 10_000 });

        await page.getByRole('button', { name: 'Destroy' }).click();

        // After destroy the token and label should no longer be visible.
        await expect(page.getByText(/Token:/)).not.toBeVisible();
        await expect(page.getByText(sessionLabel)).not.toBeVisible();
    });
});
