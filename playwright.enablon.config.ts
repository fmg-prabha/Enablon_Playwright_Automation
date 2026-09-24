import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './framework/tests/M05-Events-Incident-Management',
  testMatch: 'create-event.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  repeatEach: 1,
  timeout: 600_000,
  expect: { timeout: 20_000 },
  outputDir: 'test-results/enablon',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/enablon', open: 'never' }]],
  projects: [{ name: 'enablon-chromium', use: { ...devices['Desktop Edge'], channel: 'msedge' } }],
  use: {
    headless: false,
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    trace: 'off',
    // Captures the browser state for authentication/permission failures without logging secrets.
    screenshot: 'only-on-failure',
    video: 'off',
  },
});
