import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const UAT_ORIGIN = 'https://fortescue-ehs-az.uat.ap.enablon.io';
export const UAT_URL = UAT_ORIGIN + '/';
const TIMEOUT = 60_000;

export type LoginOptions = { username?: string; password?: string; role?: string; rolesFile?: string };
type RoleCredentialMapping = { username?: string; usernameEnv?: string; passwordEnv: string };
type RolesFile = { roles: Record<string, RoleCredentialMapping> };

const defaultRolesFilePath = resolve(__dirname, '../test-data/roles.example.json');

function getCredentials(options: LoginOptions): { username: string; password: string } {
  if (options.role) {
    const rolesFilePath = options.rolesFile ?? defaultRolesFilePath;
    const rolesFile = JSON.parse(readFileSync(rolesFilePath, 'utf8')) as RolesFile;
    const mapping = rolesFile.roles[options.role];
    if (!mapping) throw new Error(`Role '${options.role}' is missing from ${rolesFilePath}.`);
    const username = options.username ?? mapping.username ??
      (mapping.usernameEnv ? process.env[mapping.usernameEnv] : undefined);
    const password = options.password ?? process.env[mapping.passwordEnv];
    if (!username?.trim() || !password) {
      const usernameSource = mapping.usernameEnv ?? 'the configured username';
      throw new Error(`Set ${usernameSource} and ${mapping.passwordEnv} in the test process environment for role '${options.role}'.`);
    }
    return { username, password };
  }

  const username = options.username ?? process.env.ENABLON_USERNAME ?? 'eventsupervisor';
  const password = options.password ?? process.env.ENABLON_PASSWORD;
  if (!username.trim() || !password) {
    throw new Error('Set ENABLON_USERNAME and ENABLON_PASSWORD in the test process environment. Do not put passwords in source code.');
  }
  return { username, password };
}

/** Shared native UAT login. Select a role and optional module-specific roles file. Passwords are read from runtime environment variables. */
export async function login(page: Page, roleOrOptions: string | LoginOptions = {}): Promise<void> {
  const options = typeof roleOrOptions === 'string' ? { role: roleOrOptions } : roleOrOptions;
  const { username, password } = getCredentials(options);
  await page.goto(UAT_URL, { waitUntil: 'domcontentloaded' });
  const credentials = page.getByRole('link', { name: 'Sign in with credentials', exact: true });
  const usernameInput = page.getByRole('textbox', { name: 'Username', exact: true });
  const account = page.getByRole('button', { name: /^Account\s+.+/ });
  const applications = page.getByRole('heading', { name: 'Applications', exact: true });
  const main = page.locator('main');
  await expect(credentials.or(usernameInput).or(account).first()).toBeVisible({ timeout: TIMEOUT });
  if (new URL(page.url()).origin === UAT_ORIGIN && await account.isVisible() && await applications.isVisible()) return;
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
  if (result === 'rejected') throw new Error('Enablon returned Login failed. Verify the selected runtime credentials. No retry attempted.');
  await expect(account).toBeVisible({ timeout: TIMEOUT });
  await expect(applications).toBeVisible({ timeout: TIMEOUT });
  await expect(main).toBeVisible({ timeout: TIMEOUT });
}
