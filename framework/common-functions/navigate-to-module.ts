import { expect, type Page } from '@playwright/test';
import { UAT_ORIGIN } from './login';

const TIMEOUT = 60_000;

/** Navigate an authenticated session by the visible Enablon application menu. */
export async function navigateToModule(page: Page, moduleCode: string, labels: string[]): Promise<void> {
  if (new URL(page.url()).origin !== UAT_ORIGIN) throw new Error(`Log into Enablon UAT before navigating to ${moduleCode}.`);

  const apps = page.getByRole('button', { name: 'Apps', exact: true });
  await expect(apps, 'Enablon Apps navigation should be available').toBeVisible({ timeout: TIMEOUT });
  await apps.click();

  let target = page.getByRole('link', { name: labels[0], exact: true });
  let resolvedLabel = labels[0];
  for (const label of labels) {
    const link = page.getByRole('link', { name: label, exact: true });
    const button = page.getByRole('button', { name: label, exact: true });
    const candidate = link.or(button).first();
    if (await candidate.isVisible().catch(() => false)) {
      target = candidate as typeof target;
      resolvedLabel = label;
      break;
    }
  }

  await expect(target, `${moduleCode} navigation entry (${labels.join(' / ')}) should be visible`).toBeVisible({ timeout: TIMEOUT });
  await target.click();
  await expect(page.locator('main')).toBeVisible({ timeout: TIMEOUT });
  await expect(page.getByRole('link', { name: resolvedLabel, exact: true })
    .or(page.getByRole('heading', { name: resolvedLabel, exact: true })).first())
    .toBeVisible({ timeout: TIMEOUT });
}


