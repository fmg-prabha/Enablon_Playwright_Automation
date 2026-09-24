import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './framework/tests/common',
  testMatch: 'login.spec.ts',
  workers: 1,
  retries: 0,
  repeatEach: 1,
  fullyParallel: false,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  outputDir: 'test-results/login',
  reporter: [['list']],
  use: {
    ...devices['Desktop Edge'], channel: 'msedge', headless: false,
    actionTimeout: 20_000, navigationTimeout: 60_000,
    trace: 'off', screenshot: 'off', video: 'off',
  },
});

