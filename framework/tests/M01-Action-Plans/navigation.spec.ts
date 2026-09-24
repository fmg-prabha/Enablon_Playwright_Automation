import { expect, test } from '@playwright/test';
import { login } from '../../common-functions/login';
import { navigateToM01ActionPlans } from '../../common-functions/navigate-to-m01-action-plans';

test('M01-NAV-001 | Navigate to Action Plans', async ({ page }) => {
  test.skip(process.env.ENABLON_RUN_READONLY !== '1', 'Set ENABLON_RUN_READONLY=1 to access UAT.');

  await login(page);
  await navigateToM01ActionPlans(page);

  await expect(page.locator('main')).toBeVisible();
});
