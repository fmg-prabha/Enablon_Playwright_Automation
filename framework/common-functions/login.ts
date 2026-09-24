import { expect, type Page } from '@playwright/test';

export const UAT_ORIGIN = 'https://fortescue-ehs-az.uat.ap.enablon.io';
export const UAT_URL = UAT_ORIGIN + '/';
const TIMEOUT = 60_000;
export type LoginOptions = { username?: string; password?: string };

/** Shared native UAT login. No storage state, password logging or automatic retries. */
export async function login(page: Page, options: LoginOptions = {}): Promise<void> {
  const username = options.username ?? process.env.ENABLON_USERNAME ?? 'eventsupervisor';
  const password = options.password ?? process.env.ENABLON_PASSWORD;
  await page.goto(UAT_URL, { waitUntil: 'domcontentloaded' });
  const credentials = page.getByRole('link', { name: 'Sign in with credentials', exact: true });
  const usernameInput = page.getByRole('textbox', { name: 'Username', exact: true });
  const account = page.getByRole('button', { name: /^Account\s+.+/ });
  const applications = page.getByRole('heading', { name: 'Applications', exact: true });
  const main = page.locator('main');
  await expect(credentials.or(usernameInput).or(account).first()).toBeVisible({ timeout: TIMEOUT });
  if (new URL(page.url()).origin === UAT_ORIGIN && await account.isVisible() && await applications.isVisible()) return;
  if (!username.trim() || !password) {
    throw new Error('Set ENABLON_USERNAME and ENABLON_PASSWORD in the terminal before running the login test. Do not put passwords in source code.');
  }
  if (await credentials.isVisible()) await credentials.click();
  await expect(usernameInput).toBeVisible();
  if (new URL(page.url()).origin !== UAT_ORIGIN) throw new Error('Unexpected login origin; credentials were not entered.');
  await usernameInput.clear();
  await usernameInput.fill(username);
  await expect(usernameInput).toHaveValue(username);
  const passwordInput = page.getByRole('textbox', { name: 'Password', exact: true });
  await passwordInput.clear();
  await passwordInput.fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  const rejected = page.getByText('Login failed', { exact: true });
  let result = 'pending';
  try {
    await expect.poll(async () => {
      if (await rejected.isVisible()) result = 'rejected';
      else {
        const current = new URL(page.url());
        result = current.origin === UAT_ORIGIN &&
          await account.isVisible() && await applications.isVisible() && await main.isVisible() ? 'authenticated' : 'pending';
      }
      return result;
    }, { timeout: TIMEOUT, message: 'Waiting for authenticated Enablon page' }).not.toBe('pending');
  } catch {
    throw new Error('Login was not confirmed. Check for MFA, permission errors or a stalled response. No retry attempted.');
  }
  if (result === 'rejected') throw new Error('Enablon returned Login failed. Verify your runtime credentials. No retry attempted.');
  // Remain on the application's post-login landing page. Module navigation is separate.
  await expect(account).toBeVisible({ timeout: TIMEOUT });
  await expect(applications).toBeVisible({ timeout: TIMEOUT });
  await expect(main).toBeVisible({ timeout: TIMEOUT });
}
