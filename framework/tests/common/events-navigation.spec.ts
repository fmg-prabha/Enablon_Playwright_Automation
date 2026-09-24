import { test } from '@playwright/test';
import { login } from '../../common-functions/login';
import { navigateToEvents } from '../../common-functions/navigate-to-events';

test('NAV-001 | Navigate to Events after UAT login', async ({ page }) => {
  await login(page);
  await navigateToEvents(page);
  // Read-only navigation only. No Add, Save or Submit actions.
});
