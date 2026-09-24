import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/modules',
  testMatch: '**/M[0-9][0-9]-*/*.spec.ts',
  workers: 1,
  retries: 0,
  fullyParallel: false,
  timeout: 120_000,
  outputDir: 'test-results/framework',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/framework', open: 'never' }]],
  use: {
    ...devices['Desktop Edge'],
    channel: 'msedge',
    headless: false,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
});

