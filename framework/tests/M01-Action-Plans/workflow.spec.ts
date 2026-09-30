import { test, expect } from '@playwright/test';
import { ActionPlans } from './workflow';

// Offline regression checks. No Enablon requests, credentials, records or workflow writes.
test.beforeEach(async ({ page }) => { await page.route('**/*', route => route.abort()); });

test('lookup matches accessible name when adjacent elements have no textContent separator', async ({ page }) => {
  await page.setContent(`<input id="AutocompleteField-fld_zOrHie">
    <ul role="listbox"><li role="option" id="AutocompleteField-fld_zOrHie-option-0"
      onclick="document.querySelector('input').value='Fortescue Ltd'">
      <div><span><mark>Fortescue Ltd</mark></span><p>Fortescue Ltd</p></div></li></ul>`);
  expect(await page.getByRole('option').textContent()).toContain('Fortescue LtdFortescue Ltd');
  await new ActionPlans(page).selectLookup('fld_zOrHie', {
    query: 'Fortescue Ltd', optionText: 'Fortescue Ltd Fortescue Ltd', displayValue: 'Fortescue Ltd',
  });
  await expect(page.locator('input')).toHaveValue('Fortescue Ltd');
});

test('lookup selects the configured full hierarchy, not the first matching organisation name', async ({ page }) => {
  await page.setContent(`<input id="AutocompleteField-fld_Ett">
    <ul role="listbox">
      <li role="option" id="AutocompleteField-fld_Ett-option-0" onclick="document.querySelector('input').value='WRONG'">
        <div><span>Entity</span><p>TST &gt; 1051</p></div></li>
      <li role="option" id="AutocompleteField-fld_Ett-option-1" onclick="document.querySelector('input').value='Entity'">
        <div><span>Entity</span><p>Corp1 &gt; 1051</p></div></li>
    </ul>`);
  await new ActionPlans(page).selectLookup('fld_Ett', { query: 'Entity', optionText: 'Entity Corp1 > 1051', displayValue: 'Entity' });
  await expect(page.locator('input')).toHaveValue('Entity');
});

test('late onboarding modal is closed before a covered form action', async ({ page }) => {
  await page.setContent('<button id="form-action" onclick="this.textContent=\'Done\'">Form action</button>');
  const app = new ActionPlans(page);
  await app.installGuideHandler();
  await page.evaluate(() => {
    const guide = document.createElement('div');
    guide.id = 'guide'; guide.setAttribute('role', 'dialog');
    guide.style.cssText = 'position:fixed;inset:0;background:white;z-index:1000';
    guide.innerHTML = '<h2>Understand dashboards tiles and reports</h2><button id="pendo-close-guide-test">Close</button>';
    document.body.append(guide);
    guide.querySelector('button')!.addEventListener('click', () => guide.remove());
  });
  await page.getByRole('button', { name: 'Form action', exact: true }).click();
  await expect(page.locator('#guide')).toHaveCount(0);
  await expect(page.locator('#form-action')).toHaveText('Done');
});

test('guide handler does not dismiss workflow confirmation dialogs', async ({ page }) => {
  await page.setContent('<div role="dialog"><h2>Confirm approval</h2><button>Cancel</button><button>Approve</button></div>');
  await new ActionPlans(page).installGuideHandler();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeVisible();
});
