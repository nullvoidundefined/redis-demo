/** Playwright configuration: chromium-only; the web server builds and starts the
 * production app so specs run against the real Next.js server. E2E specs are a
 * post-MVP follow-up; this config is wired so adding them is drop-in. */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: 'npm run build && npm run start',
        url: 'http://localhost:3000',
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        env: {
            REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
        },
    },
});
