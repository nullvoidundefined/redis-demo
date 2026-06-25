import { expect, test } from '@playwright/test';

const DEMO_LINKS = ['Caching', 'Rate Limit', 'Queue', 'Pub/Sub'];

test('landing page renders the demo overview heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Redis Patterns Demo' })).toBeVisible();
});

test('navigation links to each Redis demo are present', async ({ page }) => {
    await page.goto('/');
    for (const label of DEMO_LINKS) {
        await expect(page.getByRole('link', { name: label })).toBeVisible();
    }
});
