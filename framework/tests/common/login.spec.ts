import { test, expect } from '@playwright/test';
import { login, UAT_ORIGIN } from '../../common-functions/login';

test('AUTH-001 | Login to Enablon UAT', async ({ page }) => {
  if (!process.env.ENABLON_USERNAME || !process.env.ENABLON_PASSWORD) {
    throw new Error('Set ENABLON_USERNAME and ENABLON_PASSWORD in the same terminal, then run the login-only config.');
  }
  await login(page);
  expect(new URL(page.url()).origin).toBe(UAT_ORIGIN);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Account\s+.+/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Applications', exact: true })).toBeVisible();
  // Login only: no Add, Save, Submit or record modifications.
});
