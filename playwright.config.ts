import { defineConfig, devices } from '@playwright/test';

const externalBaseUrl = process.env.FRONTEND_BASE_URL;
const recordVideo = process.env.E2E_RECORD_VIDEO === '1' || process.env.MANUAL_UI_EVIDENCE === '1';
const recordScreenshot = process.env.E2E_RECORD_SCREENSHOT === '1';
const artifactDir = process.env.PLAYWRIGHT_ARTIFACT_DIR;

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: process.env.MANUAL_UI_EVIDENCE ? [] : ['**/manual-ui-evidence.spec.ts'],
  outputDir: artifactDir ?? './test-results',
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
    screenshot: recordScreenshot ? 'on' : 'only-on-failure',
    video: recordVideo ? 'on' : 'retain-on-failure'
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
