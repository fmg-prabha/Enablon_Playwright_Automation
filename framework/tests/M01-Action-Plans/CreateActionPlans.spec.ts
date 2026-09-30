import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { readFixture, planDates } from './fixture';
import { ActionPlans, STAGES, type Stage } from './workflow';

const projectRoot = resolve(__dirname, '../../..');
const rolesFile = resolve(projectRoot, process.env.ENABLON_ACTIONPLAN_ROLES_FILE ?? 'framework/test-data/M01-Action-Plans/roles.example.json');
const dataFile = resolve(projectRoot, process.env.ENABLON_ACTIONPLAN_DATA_FILE ?? '.local/action-plan.json');

test.describe('Action Plans | Three-level approval', () => {
  test.skip(process.env.ENABLON_RUN_ACTIONPLAN_CREATE !== '1' || process.env.ENABLON_SAVE !== '1',
    'Creates and approves a UAT record. Explicitly set ENABLON_RUN_ACTIONPLAN_CREATE=1 and ENABLON_SAVE=1.');

  test('CreateActionPlans', async ({ browser }, testInfo) => {
    if (testInfo.retry > 0 || testInfo.repeatEachIndex > 0 || testInfo.config.workers !== 1 ||
        testInfo.project.retries !== 0 || testInfo.project.repeatEach !== 1 || testInfo.config.projects.length !== 1) {
      throw new Error('Run this write workflow once: one worker, one project, no retries and no repeat-each.');
    }
    // Preflight every identity and all evidence paths before the first application write.
    const data = readFixture(dataFile, rolesFile);
    const title = `${data.titlePrefix} - ${new Date().toISOString().replace(/[:.]/g, '-')} - ${randomUUID().slice(0, 8)}`;
    const dates = planDates(data.dueInDays);
    let recordId = '';
    let activeStep = 'Preflight';
    const results: { step: string; role: string; approvalLevel: string; status: string; result: 'PASS' }[] = [];
    let outcome: 'PASS' | 'FAIL' = 'FAIL';

    async function checkpoint(page: Page, name: string, role: string, stage: Stage): Promise<void> {
      await new ActionPlans(page).expectStage(stage);
      results.push({ step: name, role, approvalLevel: stage.approval, status: stage.status, result: 'PASS' });
      await testInfo.attach(`${String(results.length).padStart(2, '0')}-${name}`, {
        body: await page.screenshot({ fullPage: true }), contentType: 'image/png',
      });
    }

    async function asRole(role: string, task: (app: ActionPlans, page: Page) => Promise<void>): Promise<void> {
      // A fresh context prevents another role's cookies/storage from being reused by login().
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
        locale: 'en-AU', timezoneId: 'Australia/Perth', viewport: { width: 1440, height: 1000 },
      });
      const page = await context.newPage();
      page.setDefaultTimeout(30_000);
      page.setDefaultNavigationTimeout(60_000);
      const app = new ActionPlans(page);
      let authenticated = false;
      try {
        activeStep = `Login: ${role}`;
        await test.step(activeStep, () => app.signIn(role, rolesFile));
        authenticated = true;
        await task(app, page);
        activeStep = `Logout: ${role}`;
        await test.step(activeStep, () => app.signOut());
      } catch (error) {
        // Do not capture credentials on authentication pages, or let screenshot failure mask the cause.
        if (authenticated && page.url().includes('/fortescue.uat/')) {
          await page.screenshot({ fullPage: true }).then(body => testInfo.attach('failed-stage', {
            body, contentType: 'image/png',
          })).catch(() => undefined);
        }
        throw error;
      } finally {
        await context.close();
      }
    }

    try {
      await asRole(data.creatorRole, async (app, page) => {
        activeStep = 'Create and save Draft';
        await test.step(activeStep, async () => {
          await app.populate(data, title, dates);
          recordId = await app.saveNew();
          // Attach immediately so a later failure still identifies the retained UAT record.
          await testInfo.attach('created-action-plan', {
            body: JSON.stringify({ recordId, title, startDate: dates.start, originalDueDate: dates.due }, null, 2),
            contentType: 'application/json',
          });
          await app.viewSaved();
          await app.verifyDraft(data, title, data.description);
          await checkpoint(page, 'Created', data.creatorRole, STAGES.draft);
        });

        activeStep = 'Edit, save and reopen Draft';
        await test.step(activeStep, async () => {
          await app.editDescription(data.updatedDescription);
          await app.openRecord(recordId, title, data.searchPageLimit);
          await app.verifyDraft(data, title, data.updatedDescription);
          await checkpoint(page, 'Edited-and-saved', data.creatorRole, STAGES.draft);
        });

        activeStep = 'Assign to Person Responsible';
        await test.step(activeStep, async () => {
          await app.advance('Assign', STAGES.assigned);
          await checkpoint(page, 'Assigned', data.creatorRole, STAGES.assigned);
        });
      });

      await asRole(data.responsible.role, async (app, page) => {
        activeStep = 'Person Responsible completes action';
        await test.step(activeStep, async () => {
          await app.openRecord(recordId, title, data.searchPageLimit);
          await app.expectStage(STAGES.assigned);
          await app.addCompletionDetails(data);
          await app.advance(data.actions.responsible, STAGES.l1);
          await checkpoint(page, 'Submitted-to-L1', data.responsible.role, STAGES.l1);
        });
      });

      for (const transition of [
        { person: data.l1, action: data.actions.l1, before: STAGES.l1, after: STAGES.l2, label: 'L1 verification' },
        { person: data.l2, action: data.actions.l2, before: STAGES.l2, after: STAGES.l3, label: 'L2 verification' },
        { person: data.l3, action: data.actions.l3, before: STAGES.l3, after: STAGES.validated, label: 'L3 approval' },
      ]) {
        await asRole(transition.person.role, async (app, page) => {
          activeStep = transition.label;
          await test.step(activeStep, async () => {
            await app.openRecord(recordId, title, data.searchPageLimit);
            await app.expectStage(transition.before);
            await app.advance(transition.action, transition.after);
            await checkpoint(page, transition.label, transition.person.role, transition.after);
            if (transition.after === STAGES.validated) {
              activeStep = 'Reopen and verify persisted Validated / Completed';
              await app.openRecord(recordId, title, data.searchPageLimit);
              await app.expectField('Description', data.updatedDescription);
              await checkpoint(page, 'Final-persisted-state', transition.person.role, STAGES.validated);
            }
          });
        });
      }
      expect(results).toHaveLength(8);
      outcome = 'PASS';
    } finally {
      await testInfo.attach('CreateActionPlans-result', {
        body: JSON.stringify({
          caseId: data.caseId, test: 'CreateActionPlans', outcome, recordId: recordId || null, title,
          failedStep: outcome === 'FAIL' ? activeStep : null,
          retention: data.retention,
          recovery: 'Inspect this ID/title before any manual rerun. No automatic retry, deletion or approval-level override is used.',
          checkpoints: results,
        }, null, 2),
        contentType: 'application/json',
      });
    }
  });
});
