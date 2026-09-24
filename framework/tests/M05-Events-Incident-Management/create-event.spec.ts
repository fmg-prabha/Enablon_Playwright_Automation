import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { login } from '../../common-functions/login';
import { navigateToEvents } from '../../common-functions/navigate-to-events';

type Lookup = { query: string; displayValue: string; optionText?: string };
const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
// Enablon decorates selected names with numeric IDs and, sometimes, a role.
const identity = (s: string) => normalize(s).replace(/\s*\{[^{}]+\}\s*$/, '').replace(/\s*\(\d+\)\s*$/, '').trim();
const lookupNames: Record<string, string> = {
  fld_XEntity: 'Entity',
  fld_zOrHie: 'Org Hierarchy',
  fld_XClassif: 'Classification',
  fld_Locaon: 'Location',
  fld_PersonRe: 'Reported by',
  fld_Owner: 'Supervisor',
  fld_zEveOw: 'Event Owner',
  fld_zLeInv: 'Lead Investigator',
};
const environment = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env ?? {};
type EventData = {
  title: string; description: string; specificArea?: string; immediateActionsTaken?: string;
  emergencyResponseInitiated: boolean; releaseOfEnergy: boolean;
  entity: Lookup; orgHierarchy: Lookup; location: Lookup; eventOwner: Lookup; leadInvestigator: Lookup;
  reporter?: Lookup | null; eventSupervisor?: Lookup | null;
};

function readData(): EventData {
  const file = environment.ENABLON_DATA ? path.resolve(environment.ENABLON_DATA) : path.resolve(__dirname, '../../test-data/M05-Events-Incident-Management/.local/event-data.json');
  let data: EventData;
  try { data = JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
  catch (error) {
    throw new Error(`Cannot read ${file}. Copy framework/test-data/M05-Events-Incident-Management/event.example.json to framework/test-data/M05-Events-Incident-Management/.local/event-data.json and fill the test values. ${String(error)}`);
  }
  const missing: string[] = [];
  for (const key of ['title', 'description'] as const) {
    if (typeof data?.[key] !== 'string' || !data[key].trim()) missing.push(key);
  }
  for (const key of ['entity', 'orgHierarchy', 'location', 'eventOwner', 'leadInvestigator', 'reporter', 'eventSupervisor'] as const) {
    const value = data?.[key];
    if ((key === 'reporter' || key === 'eventSupervisor') && value == null) continue;
    if (typeof value?.query !== 'string' || !value.query.trim()) missing.push(`${key}.query`);
    if (typeof value?.displayValue !== 'string' || !value.displayValue.trim()) missing.push(`${key}.displayValue`);
    if (value?.optionText != null && (typeof value.optionText !== 'string' || !value.optionText.trim())) missing.push(`${key}.optionText`);
  }
  if (missing.length) throw new Error(`Complete these values in ${file}: ${missing.join(', ')}. Use real Enablon names, not placeholders.`);
  for (const key of ['emergencyResponseInitiated', 'releaseOfEnergy'] as const) {
    if (typeof data[key] !== 'boolean') throw new Error(`${key} must be true or false.`);
  }
  for (const key of ['specificArea', 'immediateActionsTaken'] as const) {
    if (data[key] != null && typeof data[key] !== 'string') throw new Error(`${key} must be text.`);
  }
  if ((data.specificArea ?? '').length > 100) throw new Error('specificArea must not exceed 100 characters.');
  return data;
}

async function dismissGuides(page: Page) {
  // These are the observed Enablon Pendo guidance overlays, not arbitrary dialogs.
  for (let n = 0; n < 5; n++) {
    const close = page.locator('button[id^="pendo-close-guide-"]:visible');
    if (!await close.count()) return;
    await close.first().click();
  }
}

async function selectLookup(page: Page, field: string, value: Lookup) {
  const label = lookupNames[field];
  if (!label) throw new Error(`Missing accessible-name mapping for lookup ${field}.`);
  // Enablon's accessible names are stable user-facing selectors. Keep the hidden
  // field ID only for the post-selection assertion that proves a real lookup was chosen.
  const input = page.getByRole('combobox', { name: label, exact: true });
  await expect(input).toBeVisible();
  await expect(input, `Lookup ${field} is not ready for input`).toBeEditable();
  if (identity(await input.inputValue()) !== identity(value.displayValue)) {
    const clear = page.getByTestId(`AutoCompleteField-ClearButton-${field}`);
    if (await clear.isVisible()) await clear.click();
    await input.fill(value.query);
    const options = page.locator(`li[role="option"][id^="AutocompleteField-${field}-option-"]:visible`);
    try {
      let refilledAfterReset = false;
      await expect.poll(async () => {
        if (await options.first().isVisible()) return true;
        // Dependent-field refreshes can replace this input after fill() succeeds.
        // Retry only once, and only if the query was actually cleared.
        if (!refilledAfterReset && await input.isVisible() && await input.isEditable() &&
            await input.inputValue() === '') {
          refilledAfterReset = true;
          await input.fill(value.query);
        }
        return false;
      }, { timeout: 20_000, message: `No suggestions for ${field}; query may have been cleared by a form refresh` }).toBe(true);
    } catch (error) {
      // Org. Hierarchy is dependent on Entity. A valid global value may legitimately
      // have zero results after the selected Entity narrows the lookup.
      if (field === 'fld_zOrHie') {
        const selectedEntity = identity(await page.getByRole('combobox', { name: 'Entity', exact: true }).inputValue());
        const message = `No Org. Hierarchy matching '${value.query}' is available under Entity '${selectedEntity}'. ` +
          'Update orgHierarchy in .local/event-data.json to a hierarchy that belongs to the selected Entity; do not retry the same incompatible data.';
        // Keep the original assertion in the call chain without relying on newer
        // ErrorOptions support in the project TypeScript version.
        const diagnostic = new Error(message);
        (diagnostic as Error & { cause?: unknown }).cause = error;
        throw diagnostic;
      }
      throw error;
    }
    // The secondary code is normally a paragraph. Compare the primary label exactly;
    // optionText provides an exact full-text alternative where names are duplicated.
    const expected = normalize(value.optionText ?? value.displayValue);
    const candidates = await options.evaluateAll((elements, fullText) => elements.map(element => {
      const clone = element.cloneNode(true) as HTMLElement;
      if (!fullText) clone.querySelectorAll('p').forEach(p => p.remove());
      return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
    }), Boolean(value.optionText));
    const indexes = candidates.flatMap((label, index) => (value.optionText ? label === expected : identity(label) === identity(expected)) ? [index] : []);
    if (indexes.length !== 1) throw new Error(`Lookup ${field}: expected one exact match for '${expected}', found ${indexes.length}. Actual suggestions: ${JSON.stringify(candidates)}. Set a unique query and, if needed, optionText in the local data file.`);
    await options.nth(indexes[0]).click();
    await expect.poll(async () => identity(await input.inputValue())).toBe(identity(value.displayValue));
  }
  // Confirm a relationship was selected; typing free text alone is not enough.
  const selectedId = page.locator(`input[type="hidden"][name="${field}"]`);
  await expect(selectedId).not.toHaveValue('');
  await expect.poll(async () => identity(await input.inputValue())).toBe(identity(value.displayValue));
}

test('populate a new Health & Safety Incident; save only when ENABLON_SAVE=1', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'enablon-chromium', 'Use --config=playwright.enablon.config.ts to avoid multi-browser creation.');
  if (testInfo.retry > 0 || testInfo.repeatEachIndex > 0 || testInfo.config.workers !== 1) {
    throw new Error('Run this write-capable test once, with one worker and no retries.');
  }
  const data = readData();
  const save = environment.ENABLON_SAVE === '1';
  const title = `${data.title} ${new Date().toISOString()} ${randomUUID().slice(0, 8)}`;
  let saveAttempted = false;
  let outcome = 'FailedBeforeSave';
  try {
    await test.step('Login to UAT', async () => { await login(page); });
    await test.step('Navigate: Apps > Health & Safety > Events', async () => { await navigateToEvents(page); });
    await test.step('Click Add a new Event', async () => {
      await dismissGuides(page);
      const addEvent = page.getByRole('button', { name: 'Add a new Event', exact: true });
      await expect(addEvent).toBeVisible();
      await expect(addEvent).toBeEnabled();
      await addEvent.click();
      await expect(page.getByRole('textbox', { name: 'Event Title', exact: true })).toBeVisible();
    });
    const titleInput = page.getByRole('textbox', { name: 'Event Title', exact: true });
    await expect(titleInput).toBeVisible();
    await selectLookup(page, 'fld_XEntity', data.entity);
    // Enablon reloads the dependent Org. Hierarchy lookup after Entity changes.
    await page.waitForTimeout(1_000);
    await expect(page.locator('#AutocompleteField-fld_zOrHie')).toBeEditable();
    await selectLookup(page, 'fld_zOrHie', data.orgHierarchy);
    const eventType = page.getByRole('combobox', { name: 'Event Type', exact: true });
    const selectedType = await eventType.locator('option:checked').textContent();
    if (selectedType?.trim() !== 'Incident') {
      await eventType.selectOption({ label: 'Incident' });
    }
    await selectLookup(page, 'fld_XClassif', { query: 'Health', displayValue: 'Health & Safety', optionText: 'Health & SafetyHS' });
    await selectLookup(page, 'fld_Locaon', data.location);
    await page.getByRole('textbox', { name: 'Specific Area', exact: true }).fill(data.specificArea ?? '');
    const description = page.frameLocator('#rte_fld_XEventsd_ifr').locator('#tinymce');
    await description.fill(data.description);
    await expect(description).toHaveText(data.description);
    await page.getByRole('group', { name: 'Emergency Response Initiated?', exact: true })
      .getByRole('radio', { name: data.emergencyResponseInitiated ? 'Yes' : 'No', exact: true }).check();
    await page.getByRole('group', { name: 'Release of Energy?', exact: true })
      .getByRole('radio', { name: data.releaseOfEnergy ? 'Yes' : 'No', exact: true }).check();
    await page.getByRole('textbox', { name: 'Immediate Actions Taken', exact: true }).fill(data.immediateActionsTaken ?? '');
    if (data.reporter) await selectLookup(page, 'fld_PersonRe', data.reporter);
    if (data.eventSupervisor) await selectLookup(page, 'fld_Owner', data.eventSupervisor);
    await selectLookup(page, 'fld_zEveOw', data.eventOwner);
    await selectLookup(page, 'fld_zLeInv', data.leadInvestigator);
    for (const field of ['fld_PersonRe', 'fld_Owner']) {
      await expect(page.locator(`input[type="hidden"][name="${field}"]`)).not.toHaveValue('');
    }
    // Fill after dependent lookups, which can refresh the form and clear free text.
    await titleInput.fill(title);
    await expect(titleInput).toHaveValue(title);
    // Verify dependent refreshes have not cleared values populated earlier.
    for (const [field, value] of [
      ['fld_XEntity', data.entity], ['fld_zOrHie', data.orgHierarchy],
      ['fld_Locaon', data.location], ['fld_zEveOw', data.eventOwner],
      ['fld_zLeInv', data.leadInvestigator],
    ] as const) {
      await expect.poll(async () => identity(await page.getByRole('combobox', { name: lookupNames[field], exact: true }).inputValue())).toBe(identity(value.displayValue));
      await expect(page.locator(`input[type="hidden"][name="${field}"]`)).not.toHaveValue('');
    }
    await expect(description).toHaveText(data.description);
    await expect(page.getByRole('textbox', { name: 'Specific Area', exact: true })).toHaveValue(data.specificArea ?? '');
    await expect(page.getByRole('textbox', { name: 'Immediate Actions Taken', exact: true })).toHaveValue(data.immediateActionsTaken ?? '');
    await expect(page.getByRole('group', { name: 'Emergency Response Initiated?', exact: true })
      .getByRole('radio', { name: data.emergencyResponseInitiated ? 'Yes' : 'No', exact: true })).toBeChecked();
    await expect(page.getByRole('group', { name: 'Release of Energy?', exact: true })
      .getByRole('radio', { name: data.releaseOfEnergy ? 'Yes' : 'No', exact: true })).toBeChecked();

    if (!save) {
      console.log('Form populated, NOT saved. Inspect it, then Resume. Do not manually Save during this preview.');
      await page.pause();
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Add a new Event', exact: true })).toBeVisible();
      outcome = 'PreviewCompletedNotSaved';
      return;
    }

    console.log(`Saving one synthetic UAT Event: ${title}`);
    saveAttempted = true;
    outcome = 'SaveOutcomeUncertain';
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(titleInput, 'Save was not confirmed; review validation messages and search for the unique title before rerunning.').not.toBeVisible({ timeout: 30_000 });
    console.log('Verify the saved Event ID and title in Enablon. Open its read-only detail page, then Resume.');
    await page.pause();
    // User navigates to the saved record; reload verifies that the title is persisted,
    // rather than merely appearing in the unsaved form or a transient success message.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('textbox', { name: 'Event Title', exact: true })).not.toBeVisible();
    await expect(page.getByText(title, { exact: true }).first(), 'Cannot verify persisted title after reload. Search for this title before rerunning.').toBeVisible();
    outcome = 'SavedTitleVerifiedAfterReload';
  } finally {
    await testInfo.attach('event-result', { body: JSON.stringify({ title, outcome, saveAttempted, url: page.url().split('?')[0] }, null, 2), contentType: 'application/json' });
  }
});
