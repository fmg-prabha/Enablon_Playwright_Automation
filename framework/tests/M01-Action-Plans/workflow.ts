import { expect, type Locator, type Page } from '@playwright/test';
import { login, UAT_ORIGIN } from '../../common-functions/login';
import type { ActionPlanData, Lookup } from './fixture';

const MODULE_URL = `${UAT_ORIGIN}/fortescue.uat/go.aspx?v=/AP/ActionPlans`;
const TIMEOUT = 60_000;
const visible = (locator: Locator) => locator.filter({ visible: true });
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactText = (value: string) => new RegExp(`^\\s*${escape(value).replace(/\s+/g, '\\s+')}\\s*$`);

export const STAGES = {
  draft: { approval: 'Draft', status: 'Not Started' },
  assigned: { approval: 'Assigned', status: 'In Progress' },
  l1: { approval: 'L1 Verifier', status: 'Pending Verification' },
  l2: { approval: 'L2 Verifier', status: 'Pending Verification' },
  l3: { approval: 'L3 Approver', status: 'Pending Verification' },
  validated: { approval: 'Validated', status: 'Completed' },
} as const;
export type Stage = typeof STAGES[keyof typeof STAGES];

export class ActionPlans {
  private guideHandlerInstalled = false;
  constructor(readonly page: Page) {}

  /** Pendo can insert its modal after navigation/dismissal has already completed. */
  async installGuideHandler(): Promise<void> {
    if (this.guideHandlerInstalled) return;
    const close = this.page.locator('button[id^="pendo-close-guide-"]:visible').first();
    await this.page.addLocatorHandler(close, async button => { await button.click(); });
    this.guideHandlerInstalled = true;
  }

  private control(name: string | RegExp): Locator {
    const options = { name, exact: typeof name === 'string' };
    return visible(this.page.getByRole('button', options)
      .or(this.page.getByRole('link', options))
      .or(this.page.getByRole('menuitem', options)));
  }

  private async returnHome(): Promise<boolean> {
    const home = this.control(/^Return to Home page$/i);
    if (!await home.isVisible()) return false;
    await home.click();
    await expect(this.page.getByRole('button', { name: /^Account\s+.+/ })).toBeVisible({ timeout: TIMEOUT });
    return true;
  }

  async signIn(role: string, rolesFile: string): Promise<void> {
    await this.installGuideHandler();
    try {
      await login(this.page, { role, rolesFile });
    } catch (error) {
      // User-requested recovery for the known landing-page error. Never retry a password.
      if (!await this.returnHome()) throw error;
    }
    if (new URL(this.page.url()).origin !== UAT_ORIGIN) throw new Error('Expected an authenticated UAT session.');
    await this.dismissGuide();
  }

  async signOut(): Promise<void> {
    await this.page.getByRole('button', { name: /^Account\s+.+/ }).click();
    await this.control(/^(Log out|Logout|Sign out)$/i).click();
    await expect(this.page.getByRole('link', { name: 'Sign in with credentials', exact: true })
      .or(this.page.getByRole('textbox', { name: 'Username', exact: true })).first()).toBeVisible({ timeout: TIMEOUT });
  }

  private async dismissGuide(): Promise<void> {
    const close = this.page.locator('button[id^="pendo-close-guide-"]:visible');
    for (let count = 0; count < 5 && await close.count(); count++) await close.first().click();
  }

  async openList(): Promise<void> {
    await this.page.goto(MODULE_URL, { waitUntil: 'domcontentloaded' });
    await expect(this.page.locator('#mlist').or(this.control(/^Return to Home page$/i)).first())
      .toBeVisible({ timeout: TIMEOUT });
    if (await this.returnHome()) {
      await this.page.getByRole('button', { name: 'Apps', exact: true }).click();
      await visible(this.page.getByRole('link', { name: 'Action Plans', exact: true })).click();
      await visible(this.page.getByRole('button', { name: 'Action Plans', exact: true })).click();
      await visible(this.page.getByRole('link', { name: 'Action Plans', exact: true })).click();
    }
    await this.dismissGuide();
    await expect(this.page.locator('#mlist')).toBeVisible({ timeout: TIMEOUT });
  }

  async openRecord(id: string, title: string, pageLimit: number): Promise<void> {
    await this.openList();
    const list = this.page.locator('#mlist');
    const seen = new Set<string>();
    for (let index = 0; index < pageLimit; index++) {
      const signature = await list.innerText();
      if (seen.has(signature)) throw new Error(`List pagination repeated before finding ${id}.`);
      seen.add(signature);
      const row = list.getByRole('row').filter({ has: this.page.getByText(id, { exact: true }) });
      if (await row.count()) {
        await expect(row).toHaveCount(1);
        await expect(row).toContainText(title);
        await row.getByRole('button', { name: new RegExp(`^View details ${escape(id)}:`) }).click();
        await this.expectField('Unique ID', id);
        await this.expectField('Title', title);
        return;
      }
      const next = this.control('Go to next page');
      if (!await next.isVisible() || !await next.isEnabled()) break;
      await next.click();
      await expect.poll(() => list.innerText(), { timeout: TIMEOUT, message: 'Waiting for the next Action Plans page' }).not.toBe(signature);
    }
    throw new Error(`${id} was not found within ${pageLimit} pages for this role. Check access, filters and searchPageLimit; no alternate record was opened.`);
  }

  /** Match the labelled table row, not stage text appearing in an override dropdown. */
  private fieldRow(label: string): Locator {
    return visible(this.page.getByText(label, { exact: true })).locator('xpath=ancestor::tr[1]');
  }

  async expectField(label: string, expected: string): Promise<void> {
    const row = this.fieldRow(label);
    await expect(row, `Field '${label}' must have exactly one visible row`).toHaveCount(1);
    await expect(row, `${label} should persist as '${expected}'`).toContainText(expected);
  }

  async expectStage(stage: Stage): Promise<void> {
    for (const [label, value] of [['Approval Level', stage.approval], ['Status', stage.status]]) {
      const row = this.fieldRow(label);
      await expect(row).toHaveCount(1);
      await expect(visible(row.getByText(value, { exact: true })), `${label} must equal '${value}'`).toBeVisible();
    }
  }

  private input(label: string): Locator {
    return this.page.locator(`input[aria-label="${label}"]`);
  }

  async selectLookup(field: string, lookup: Lookup): Promise<void> {
    await this.dismissGuide();
    const input = this.page.locator(`#AutocompleteField-${field}`);
    await expect(input).toBeEditable();
    await input.fill(lookup.query);
    const options = this.page.locator(`li[role="option"][id^="AutocompleteField-${field}-option-"]:visible`);
    let refilled = false;
    await expect.poll(async () => {
      await this.dismissGuide();
      if (await options.count()) return true;
      // Enablon dependent-field postbacks can clear a query once.
      if (!refilled && await input.isVisible() && await input.isEditable() && await input.inputValue() === '') {
        refilled = true;
        await input.fill(lookup.query);
      }
      return false;
    }, { timeout: 30_000, message: `Loading choices for ${field}` }).toBe(true);
    // DOM textContent concatenates the name and hierarchy (e.g. "LtdFortescue").
    // Accessible option names retain their semantic space; still require one exact match.
    const option = options.and(this.page.getByRole('option', { name: exactText(lookup.optionText) }));
    await expect(option, `Choose the exact configured option for ${field}; never the first search result`).toHaveCount(1);
    await option.click();
    await expect(input).toHaveValue(lookup.displayValue);
  }

  private async expectLookups(data: ActionPlanData): Promise<void> {
    for (const [field, key] of [
      ['fld_zOrHie', 'orgHierarchy'], ['fld_Ett', 'entity'], ['fld_Own', 'responsible'],
      ['fld_zL1Ver', 'l1'], ['fld_zL2Ver', 'l2'], ['fld_zL3App', 'l3'],
    ] as const) await expect(this.page.locator(`#AutocompleteField-${field}`)).toHaveValue(data[key].displayValue);
  }

  async populate(data: ActionPlanData, title: string, dates: { start: string; due: string }): Promise<void> {
    await this.openList();
    await this.control(/^(Add|Create) a new Action Plan$/).click();
    await this.dismissGuide();
    await this.page.locator('#fld_zAcCat_0').check(); // Standard Action
    await this.page.locator('#fld_PRTY_0').check(); // Improvement Opportunity
    await this.page.locator('select[aria-label="Hierarchy of Control"]').selectOption({ label: data.hierarchyOfControl });
    await this.selectLookup('fld_zOrHie', data.orgHierarchy);
    await this.selectLookup('fld_Ett', data.entity);
    await this.selectLookup('fld_Own', data.responsible);
    const levels = this.page.locator('select[aria-label="No. of Levels Required for Verification"]');
    await levels.selectOption({ label: '3 (L1 & L2 & L3 verification)' });
    await this.selectLookup('fld_zL1Ver', data.l1);
    await this.selectLookup('fld_zL2Ver', data.l2);
    await this.selectLookup('fld_zL3App', data.l3);
    await this.page.locator('#fld_zInAct_0').check(); // Not an insurance action
    await this.page.locator('select[aria-label="Recurrence"]').selectOption({ label: 'None' });
    await this.page.locator(`#fld_zICERe_${data.completionEvidenceRequired ? '1' : '0'}`).check();
    // Fill text/date fields after dynamic lookups and radio-driven form refreshes.
    await this.input('Title').fill(title);
    await this.page.locator('textarea[aria-label="Description"]').fill(data.description);
    await this.input('Start Date').fill(dates.start);
    await this.input('Original Due Date').fill(dates.due);
    await this.input('Original Due Date').press('Tab');
    await this.expectLookups(data);
    await expect(this.input('Title')).toHaveValue(title);
    await expect(levels.locator('option:checked')).toHaveText('3 (L1 & L2 & L3 verification)');
    await expect(this.page.locator('#fld_zAcCat_0')).toBeChecked();
    await expect(this.page.locator('#fld_PRTY_0')).toBeChecked();
    await expect(this.page.locator(`#fld_zICERe_${data.completionEvidenceRequired ? '1' : '0'}`)).toBeChecked();
  }

  /** Save once and wait for its application response. No retries of write actions. */
  private async save(): Promise<void> {
    const responsePromise = this.page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.origin === UAT_ORIGIN && url.pathname.startsWith('/fortescue.uat/') &&
        ['document', 'xhr', 'fetch'].includes(response.request().resourceType()) && response.request().method() === 'POST';
    }, { timeout: TIMEOUT });
    const [response] = await Promise.all([responsePromise, this.control('Save').click()]);
    if (!response.ok()) throw new Error(`Save returned HTTP ${response.status()}; the action will not be retried.`);
    await response.finished();
    const errors = this.page.locator('[id^="Err__"]:visible');
    await expect(errors, 'No field-validation errors after Save').toHaveCount(0);
  }

  async saveNew(): Promise<string> {
    await this.save();
    const id = visible(this.page.getByText(/^ACT-\d+$/, { exact: true }));
    await expect(id, 'Save must create a unique Action Plan ID').toHaveCount(1);
    return (await id.innerText()).trim();
  }

  async viewSaved(): Promise<void> {
    // Save leaves the record in edit mode in this Enablon configuration.
    const title = this.input('Title');
    if (await title.isVisible() && await title.isEditable()) await this.control('Cancel').click();
    await expect(this.control('Edit')).toBeVisible();
  }

  async verifyDraft(data: ActionPlanData, title: string, description: string): Promise<void> {
    await this.expectStage(STAGES.draft);
    await this.expectField('Title', title);
    await this.expectField('Description', description);
    await this.control('Edit').click();
    await this.expectLookups(data);
    await expect(this.page.locator('textarea[aria-label="Description"]')).toHaveValue(description);
    await this.viewSaved();
  }

  async editDescription(description: string): Promise<void> {
    await this.control('Edit').click();
    await this.page.locator('textarea[aria-label="Description"]').fill(description);
    await this.save();
    await this.viewSaved();
    await this.expectField('Description', description);
  }

  async addCompletionDetails(data: ActionPlanData): Promise<void> {
    await this.control('Edit').click();
    // Notes is an observed edit-form control; it clears after Save and is retained in history.
    await this.page.locator('textarea[aria-label="Notes"]').fill(data.completionComments);
    if (data.evidenceFiles.length) {
      const evidence = this.fieldRow('Completion Evidence').locator('input[type="file"]');
      await expect(evidence, 'Upload into Completion Evidence, not Supporting Documents').toHaveCount(1);
      await evidence.setInputFiles(data.evidenceFiles);
    }
    await this.save();
    await this.viewSaved();
    await this.expectStage(STAGES.assigned);
  }

  async advance(action: string, expected: Stage): Promise<void> {
    let unknownDialog = '';
    let modalConfirmed = false;
    const handleDialog = async (dialog: import('@playwright/test').Dialog) => {
      if (dialog.type() === 'confirm' && /\b(assign|complete|approv\w*|validat\w*|submit)\b/i.test(dialog.message())) await dialog.accept();
      else {
        unknownDialog = dialog.message();
        await dialog.dismiss();
      }
    };
    this.page.on('dialog', handleDialog);
    try {
      const control = this.control(action);
      if (!await control.isVisible()) await this.control(/^More\s*(?:\.{3}|…)?$/).click();
      await expect(control, `Role must expose the '${action}' workflow action`).toBeVisible();
      await control.click(); // Never replay a workflow action after an uncertain response.
      await expect.poll(async () => {
        if (unknownDialog) throw new Error(`Unexpected confirmation was dismissed: ${unknownDialog}`);
        const dialog = visible(this.page.getByRole('dialog'));
        if (!modalConfirmed && await dialog.count()) {
          // Only a positive workflow confirmation within a visible modal is supported.
          await expect(dialog).toHaveCount(1);
          await expect(dialog).toContainText(/assign|complete|approv|validat|submit/i);
          const confirm = dialog.getByRole('button', { name: /^(Yes|OK|Confirm|Complete|Approve|Validate|Assign|Submit)$/i });
          await expect(confirm).toHaveCount(1);
          modalConfirmed = true;
          await confirm.click();
        }
        return (await this.fieldRow('Approval Level').innerText()).includes(expected.approval);
      }, { timeout: TIMEOUT, message: `Waiting for ${expected.approval} after '${action}'` }).toBe(true);
      await this.expectStage(expected);
    } finally {
      this.page.off('dialog', handleDialog);
    }
  }
}
