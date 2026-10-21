import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './framework/tests/FirstAxisAutomation',
  testMatch: 'locations.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  repeatEach: 1,
  maxFailures: 1,
  timeout: 20 * 60_000,
  expect: { timeout: 30_000 },
  outputDir: './test-results/firstaxis',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/firstaxis', open: 'never' }],
  ],
  use: {
    ...devices['Desktop Edge'],
    channel: 'msedge',
    headless: true,
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
});
