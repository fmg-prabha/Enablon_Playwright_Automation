import { expect, type Page } from '@playwright/test';
import { UAT_ORIGIN } from './login';

const TIMEOUT = 60_000;

/** Navigate through Apps > Action Plans > Action Plans > Action Plans. */
export async function navigateToM01ActionPlans(page: Page): Promise<void> {
  if (new URL(page.url()).origin !== UAT_ORIGIN) {
    throw new Error('Log into Enablon UAT before navigating to M01 Action Plans.');
  }

  await clickVisibleItem(page, 'Apps', 'button');
  await clickVisibleItem(page, 'Action Plans');
  await clickVisibleItem(page, 'Action Plans');
  await clickVisibleItem(page, 'Action Plans');

  await expect(page.locator('main'), 'M01 Action Plans page should be open').toBeVisible({ timeout: TIMEOUT });
}

async function clickVisibleItem(
  page: Page,
  name: string,
  preferredRole?: 'button' | 'link',
): Promise<void> {
  const link = page.getByRole('link', { name, exact: true });
  const button = page.getByRole('button', { name, exact: true });
  const item = preferredRole === 'button'
    ? button
    : preferredRole === 'link'
      ? link
      : link.or(button).first();

  await expect(item, `Navigation item '${name}' should be visible`).toBeVisible({ timeout: TIMEOUT });
  await item.click();
}
