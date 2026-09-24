import { expect, type Page } from '@playwright/test';
import { UAT_ORIGIN } from './login';

export const EVENTS_URL = UAT_ORIGIN + '/fortescue.uat/go.aspx?v=/IMS/Incidents';

/** Navigate an authenticated session to Events; never sign in or create a record here. */
export async function navigateToEvents(page: Page): Promise<void> {
  if (new URL(page.url()).origin !== UAT_ORIGIN) throw new Error('Log into UAT before navigating to Events.');
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  // Apps exposes the sidebar link; the dashboard card has the same accessible name.
  await page.getByTestId('sidebar-application-IMS').click();
  // Health & Safety has an Events menu group and an Events record-list link.
  const eventsLink = page.locator('a[href="go.aspx?v=/IMS/Incidents"]', { hasText: /^Events$/ });
  const eventsGroup = page.getByRole('button', { name: 'Events', exact: true });
  await expect(eventsLink.or(eventsGroup).first()).toBeVisible({ timeout: 60_000 });
  if (!await eventsLink.first().isVisible()) await eventsGroup.first().click();
  await eventsLink.first().click();
  await expect(page).toHaveURL(url => url.origin === UAT_ORIGIN &&
    url.pathname === '/fortescue.uat/go.aspx' && url.searchParams.get('v') === '/IMS/Incidents');
  await expect(page.locator('main')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('link', { name: 'Events', exact: true }).first()).toBeVisible();
}
