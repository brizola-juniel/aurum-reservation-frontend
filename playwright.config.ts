import { defineConfig, devices } from '@playwright/test';

const externalBaseUrl = process.env.FRONTEND_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: process.env.MANUAL_UI_EVIDENCE ? [] : ['**/manual-ui-evidence.spec.ts'],
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/playwright-junit.xml' }],
    ['json', { outputFile: 'test-results/playwright-report.json' }],
    ['list']
  ],
  ...(process.env.LIVE_E2E ? { workers: 1 } : {}),
  use: {
    baseURL: externalBaseUrl ?? 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  ...(externalBaseUrl
    ? {}
    : {
        webServer: {
          command: 'pnpm exec next dev --hostname 127.0.0.1 --port 3000',
          url: 'http://127.0.0.1:3000',
          reuseExistingServer: true,
          timeout: 120_000
        }
      }),
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } }
  ]
});
