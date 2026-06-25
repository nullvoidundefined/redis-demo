/** Accessibility spec: run axe-core WCAG 2.0 A and AA rules against every demo
 * route and assert zero violations. If real violations are found, fix the
 * underlying component rather than weakening this assertion. */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ROUTES = ['/', '/caching', '/rate-limit', '/queue', '/pubsub', '/leaderboard', '/session'];

for (const route of ROUTES) {
    test(`no detectable accessibility violations on ${route}`, async ({ page }) => {
        await page.goto(route);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
        expect(results.violations).toEqual([]);
    });
}
