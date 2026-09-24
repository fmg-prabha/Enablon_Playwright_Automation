import { test } from '@playwright/test';
import { login } from './helpers/login';

test('M05-ACCESS-001 | Events access', async ({ page }) => {
  test.skip(process.env.ENABLON_RUN_READONLY !== '1', 'Set ENABLON_RUN_READONLY=1 to access UAT.');
  await login(page);
});
