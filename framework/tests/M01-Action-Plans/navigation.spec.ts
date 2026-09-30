import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { login } from '../../common-functions/login';
import { navigateToM01ActionPlans } from '../../common-functions/navigate-to-m01-action-plans';

const rolesFile = resolve(__dirname, '../../test-data/M01-Action-Plans/roles.example.json');
const loginRole = 'Action.Actioncontributor1' as const;

test('M01-NAV-001 | Login and navigate to Action Plans as Action.Actioncontributor1', async ({ page }) => {
  test.skip(process.env.ENABLON_RUN_READONLY !== '1', 'Set ENABLON_RUN_READONLY=1 to access UAT.');

  await login(page, { role: loginRole, rolesFile });
  await navigateToM01ActionPlans(page);
  await expect(page.locator('main')).toBeVisible();
});
