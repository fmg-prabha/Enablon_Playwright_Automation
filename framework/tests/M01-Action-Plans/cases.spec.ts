import { test } from '@playwright/test';
import { resolve } from 'node:path';
import { login } from '../../common-functions/login';
import { navigateToM01ActionPlans } from '../../common-functions/navigate-to-m01-action-plans';

const rolesFile = resolve(__dirname, '../../test-data/M01-Action-Plans/roles.example.json');
const loginRole = 'Action.Actioncontributor1' as const;

// Draft only: required form fields, approved values, expected status, and cleanup
// must be supplied before this write-capable test can be enabled.
test.describe('M01 | Action Plans | Business test cases', () => {
  test.fixme('M01-TC-001-CreateActionPlan', async ({ page }) => {
    await login(page, { role: loginRole, rolesFile });
    await navigateToM01ActionPlans(page);
    await page.getByRole('button', { name: 'Create a new Action Plan', exact: true }).click();

    // TODO: inspect the form, load approved fixture values, fill every required field,
    // verify the saved record, and apply the approved cleanup plan.
  });
});
