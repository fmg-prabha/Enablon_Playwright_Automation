import { expect, type Page } from '@playwright/test';
import { login as commonLogin } from '../../../common-functions/login';
import { navigateToEvents } from '../../../common-functions/navigate-to-events';
export { EVENTS_URL } from '../../../common-functions/navigate-to-events';

/** Compatibility wrapper: existing M05 callers share authentication and keep their permission check. */
export async function login(page: Page): Promise<void> {
  await commonLogin(page);
  await navigateToEvents(page);
  await expect(page.getByRole('button', { name: 'Add a new Event', exact: true }),
    'Authenticated, but Events create permission is unavailable.').toBeVisible({ timeout: 60_000 });
}
