import { defineConfig, devices } from '@playwright/test';

// Explicit, write-enabled scenario. The normal read-only configuration is unchanged.
export default defineConfig({
  testDir: './framework/tests/M01-Action-Plans',
  testMatch: 'CreateActionPlans.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  repeatEach: 1,
  maxFailures: 1,
  timeout: 20 * 60_000,
  expect: { timeout: 30_000 },
  outputDir: './test-results/action-plans',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/action-plans', open: 'never' }],
  ],
  use: {
    ...devices['Desktop Edge'],
    channel: 'msedge',
    headless: false,
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    // Login credentials must not be captured in traces or videos.
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
});
