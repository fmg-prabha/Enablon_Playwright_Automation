import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { login } from '../../common-functions/login';
import { EVENTS_URL, navigateToEvents } from '../../common-functions/navigate-to-events';

type LocationRow = { row: number; entity: string; location: string; active: 'Yes' | 'No'; previousResult?: string };
type RowResult = LocationRow & { result: 'PASS' | 'FAIL'; details?: string };

const workbook = process.env.FIRSTAXIS_LOCATIONS_FILE ?? join(process.env.USERPROFILE ?? '', 'Downloads', 'Locations-UAT_Test.xlsx');
const workbookHelper = resolve(__dirname, 'locations-workbook.ps1');
const timeout = 30_000;
const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
const identity = (value: string) => normalize(value).replace(/\s*\{[^{}]+\}\s*$/, '').replace(/\s*\(\d+\)\s*$/, '').trim();
const entityOptionName = (value: string) => normalize(value).replace(/Corp\d+\s*>.*$/i, '').trim();

function workbookRows(): LocationRow[] {
  const raw = execFileSync('powershell.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', workbookHelper,
    '-Mode', 'Read', '-Workbook', workbook,
  ], { encoding: 'utf8', windowsHide: true, timeout: 60_000 });
  return JSON.parse(raw.trim()) as LocationRow[];
}

function writeWorkbookResult(result: Pick<RowResult, 'row' | 'result' | 'details'>): void {
  const tempDir = mkdtempSync(join(tmpdir(), 'firstaxis-result-'));
  const resultsFile = join(tempDir, 'results.json');
  try {
    writeFileSync(resultsFile, JSON.stringify({ results: [result] }), 'utf8');
    execFileSync('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', workbookHelper,
      '-Mode', 'Write', '-Workbook', workbook, '-ResultsJson', resultsFile,
    ], { encoding: 'utf8', windowsHide: true, timeout: 120_000 });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function dismissPrivacyNotice(page: Page): Promise<void> {
  const notice = page.getByRole('dialog').filter({ hasText: 'Privacy Notice' });
  if (await notice.isVisible().catch(() => false)) {
    await notice.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(notice).toBeHidden({ timeout: 10_000 });
  }
}

async function selectEntity(page: Page, entity: string): Promise<void> {
  const input = page.getByRole('combobox', { name: 'Entity', exact: true });
  await expect(input).toBeVisible();
  await input.fill(entity);
  const options = page.locator('li[role="option"][id^="AutocompleteField-fld_XEntity-option-"]:visible');
  await expect(options.first(), `No Entity suggestions appeared for '${entity}'.`).toBeVisible({ timeout: 20_000 });
  const labels = await options.allTextContents();
  // Enablon concatenates the entity with its Org Hierarchy in the option text
  // (for example, "SolomonCorp1 > ..."). Compare only the entity portion and
  // exclude test hierarchies such as "TST-Corp1".
  const matches = labels.flatMap((label, index) => {
    const isTestHierarchy = /\bTST(?:-|\b)/i.test(normalize(label));
    return !isTestHierarchy && entityOptionName(label) === identity(entity) ? [index] : [];
  });
  if (matches.length !== 1) throw new Error(`Expected one Entity option for '${entity}', found ${matches.length}: ${JSON.stringify(labels)}`);
  await options.nth(matches[0]).click();
  await expect.poll(async () => identity(await input.inputValue())).toBe(identity(entity));
  await expect(page.locator('input[type="hidden"][name="fld_XEntity"]')).not.toHaveValue('');
}

async function checkLocation(page: Page, row: LocationRow): Promise<void> {
  // The current form exposes Location as a labeled text input; older builds expose
  // it as a combobox or by the generated Enablon field ID.
  const labelledText = page.getByRole('textbox', { name: /^Location\b/i }).first();
  const labelledCombo = page.getByRole('combobox', { name: /^Location\b/i }).first();
  const generatedInput = page.locator('#AutocompleteField-fld_Locaon');
  const input = await labelledText.isVisible().catch(() => false)
    ? labelledText
    : await labelledCombo.isVisible().catch(() => false)
      ? labelledCombo
      : generatedInput;
  await expect(input).toBeVisible();
  await expect(input).toBeEditable();
  await input.click();
  await input.fill('');
  // This legacy lookup reacts to keyboard input as well as the input value.
  await input.pressSequentially(row.location, { delay: 40 });
  await expect(input).toHaveValue(row.location);
  const options = page.locator('li[role="option"][id^="AutocompleteField-fld_Locaon-option-"]:visible');
  const matchingIndexes = async () => (await options.allTextContents())
    .flatMap((label, index) => normalize(label).includes(normalize(row.location)) ? [index] : []);

  if (row.active === 'Yes') {
    await expect.poll(async () => (await matchingIndexes()).length, {
      timeout: 20_000,
      message: `Active=Yes, but Location '${row.location}' was not available.`,
    }).toBe(1);
    const matches = await matchingIndexes();
    await options.nth(matches[0]).click();
    await expect.poll(async () => identity(await input.inputValue())).toContain(identity(row.location));
    await expect(page.locator('input[type="hidden"][name="fld_Locaon"]')).not.toHaveValue('');
    return;
  }

  // Allow the autocomplete request to settle. An inactive location passes when
  // no matching result is offered and no hidden lookup value has been selected.
  await page.waitForTimeout(3_000);
  const matches = await matchingIndexes();
  const labels = await options.allTextContents();
  if (matches.length > 0) throw new Error(`Active=No, but Location '${row.location}' was available: ${JSON.stringify(labels)}`);
  await expect(page.locator('input[type="hidden"][name="fld_Locaon"]')).toHaveValue('');
}

async function cancelForm(page: Page): Promise<void> {
  if (page.isClosed()) throw new Error('The browser page closed before the Events list could be restored.');
  await dismissPrivacyNotice(page);
  const add = page.getByRole('button', { name: 'Add a new Event', exact: true });
  if (await add.isVisible()) return;
  const cancel = page.getByRole('button', { name: 'Cancel', exact: true });
  try {
    if (await cancel.isVisible()) {
      await cancel.click({ timeout: 10_000 });
      await dismissPrivacyNotice(page);
      await expect(add).toBeVisible({ timeout: 10_000 });
      return;
    }
  } catch (error) {
    if (page.isClosed()) throw error;
    console.warn(`Cancel did not restore the Events list: ${String(error)}`);
  }

  // Leave the unsaved form without submitting an Event. Accept only the native
  // beforeunload prompt, if this application uses one when leaving the form.
  const discardUnsaved = async (dialog: import('@playwright/test').Dialog) => {
    if (dialog.type() === 'beforeunload') await dialog.accept();
    else await dialog.dismiss();
  };
  page.on('dialog', discardUnsaved);
  try {
    await page.goto(EVENTS_URL, { waitUntil: 'domcontentloaded', timeout });
    await dismissPrivacyNotice(page);
    await expect(add, 'Could not restore the Events list; stopping to avoid cascading row failures.').toBeVisible({ timeout });
  } finally {
    page.off('dialog', discardUnsaved);
  }
}

test('FirstAxis | Event location lookup follows the workbook Active flag', async ({ page }, testInfo) => {
  const startedAt = Date.now();
  test.skip(process.env.ENABLON_RUN_FIRSTAXIS !== '1', 'Set ENABLON_RUN_FIRSTAXIS=1 to run the UAT location checks.');
  if (testInfo.retry > 0 || testInfo.repeatEachIndex > 0 || testInfo.config.workers !== 1 || testInfo.project.retries !== 0) {
    throw new Error('Run FirstAxis once with one worker and no retries.');
  }

  const allRows = workbookRows();
  const rows = process.env.FIRSTAXIS_RESUME === '1'
    ? allRows.filter(row => row.previousResult?.trim().toUpperCase() !== 'PASS')
    : allRows;
  console.log(`Checking ${rows.length} workbook rows; skipping ${allRows.length - rows.length} previously passed rows.`);
  if (rows.length === 0) return;
  // Keep checkpoints outside Playwright's output directory, which it clears on
  // the next run. Save before Excel so a blocked COM call cannot lose results.
  const checkpointDir = resolve('artifacts', 'firstaxis');
  mkdirSync(checkpointDir, { recursive: true });
  const checkpointFile = join(checkpointDir, `results-${startedAt}.json`);
  // Include login, lookup assertions, form recovery, and Excel writes in the
  // budget. The fixed 20-minute limit is too short for larger workbooks.
  const runTimeout = Math.max(testInfo.timeout, 5 * 60_000 + rows.length * 3 * 60_000);
  testInfo.setTimeout(runTimeout);
  const deadline = startedAt + runTimeout;
  const results: RowResult[] = [];
  await test.step('Sign in and open Events', async () => {
    await login(page);
    await dismissPrivacyNotice(page);
    await navigateToEvents(page);
    await dismissPrivacyNotice(page);
  });

  for (const row of rows) {
    let details: string | undefined;
    let cleanupError: Error | undefined;
    try {
      await test.step(`Workbook row ${row.row}: ${row.entity} / ${row.location} (Active=${row.active})`, async () => {
        await dismissPrivacyNotice(page);
        const add = page.getByRole('button', { name: 'Add a new Event', exact: true });
        await expect(add).toBeVisible({ timeout });
        await add.click();
        await dismissPrivacyNotice(page);
        await expect(page.getByRole('textbox', { name: 'Event Title', exact: true })).toBeVisible();
        await selectEntity(page, row.entity);
        // Entity selection refreshes dependent form controls in the Events form.
        await page.waitForTimeout(1_000);
        await expect(page.locator('#AutocompleteField-fld_Locaon')).toBeEditable();
        await checkLocation(page, row);
      });
      results.push({ ...row, result: 'PASS' });
    } catch (error) {
      // Do not turn browser teardown or a whole-test timeout into location
      // failures for every remaining workbook row.
      if (page.isClosed() || Date.now() >= deadline) throw error;
      details = error instanceof Error ? error.message : String(error);
      results.push({ ...row, result: 'FAIL', details });
    } finally {
      if (!page.isClosed() && Date.now() < deadline) await cancelForm(page).catch(error => {
        cleanupError = error instanceof Error ? error : new Error(String(error));
        const result = results.at(-1);
        if (result?.row === row.row) {
          result.result = 'FAIL';
          result.details = [result.details, `Could not close unsaved form: ${String(error)}`].filter(Boolean).join('\n');
        }
      });
    }

    const rowResult = results[results.length - 1];
    writeFileSync(checkpointFile, JSON.stringify({ workbook, results }, null, 2), 'utf8');
    console.log(`Workbook row ${rowResult.row} (${rowResult.entity} / ${rowResult.location}, Active=${rowResult.active}): ${rowResult.result}${rowResult.details ? ` — ${rowResult.details}` : ''}`);
    await testInfo.attach(`FirstAxis-row-${rowResult.row}`, {
      body: JSON.stringify(rowResult, null, 2),
      contentType: 'application/json',
    });
    try {
      writeWorkbookResult({ row: rowResult.row, result: rowResult.result, details: rowResult.details });
    } catch (error) {
      throw new Error(`Excel result write failed at row ${row.row}. Checked results are preserved in ${checkpointFile}. Close Excel dialogs and repair from that checkpoint before resuming. Original error: ${String(error)}`);
    }
    if (cleanupError) throw cleanupError;
  }

  await testInfo.attach('FirstAxis-location-results', {
    body: JSON.stringify({ workbook, checked: results.length, results }, null, 2),
    contentType: 'application/json',
  });
  expect(results.filter(result => result.result === 'PASS'), JSON.stringify(results, null, 2)).toHaveLength(rows.length);
});
