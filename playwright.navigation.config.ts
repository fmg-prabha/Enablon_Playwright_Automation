import { defineConfig } from '@playwright/test';
import loginConfig from './playwright.login.config';

export default defineConfig({
  ...loginConfig,
  testMatch: 'events-navigation.spec.ts',
  outputDir: 'test-results/navigation',
});
