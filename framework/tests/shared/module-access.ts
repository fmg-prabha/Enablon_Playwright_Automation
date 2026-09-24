import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const origin = 'https://fortescue-ehs-az.uat.ap.enablon.io';
// Existing project routes; live verification is still required.
const routes: Record<string, { name: string; route: string; marker: string; key: string }[]> = {
  M01: [{name:'Action Plans', route:'/AP/CAPA', marker:'Action', key:'actionPlans'}],
  M13: [{name:'Risk Management', route:'/ra/LocalRisksAlias0', marker:'Risks', key:'risk'}, {name:'Controls Library', route:'/ra/CS_ControlsLibrary', marker:'Controls Library', key:'controls'}],
  M14: [{name:'Risk Reports', route:'/ra/CusRep&su=ra%21%2D1&pm=0&FoldNo=49&curdtab=1', marker:'Reports', key:'reports'}],
};

export function codedModuleAccess(code: string): void {
  const definitions = routes[code];
  if (!definitions) {
    test.skip(code + '-ACCESS-001 | Route, selectors and role fixtures pending', async () => {});
    return;
  }
  for (const module of definitions) {
    test(code + '-ACCESS | ' + module.name, async ({page}, testInfo) => {
      test.skip(process.env.ENABLON_RUN_READONLY !== '1', 'Set ENABLON_RUN_READONLY=1 to access UAT.');
      const file = process.env.ENABLON_MODULE_DATA
        ? path.resolve(process.env.ENABLON_MODULE_DATA)
        : path.resolve(__dirname, '../../test-data/.local/module-data.json');
      let fixtures;
      try { fixtures = JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
      catch { throw new Error('Create framework/test-data/.local/module-data.json from framework/test-data/modules.example.json.'); }
      test.skip(!fixtures[module.key]?.validRole, 'Configure the module role fixture before running.');
      const parameter = code === 'M01' || code === 'M14' ? 'u' : 'v';
      const url = origin + '/fortescue.uat/go.aspx?' + parameter + '=' + module.route;
      await page.goto(url, {waitUntil:'domcontentloaded'});
      const credentials = page.getByRole('link', {name:'Sign in with credentials', exact:true});
      const username = page.getByRole('textbox', {name:'Username', exact:true});
      await expect(credentials.or(username).or(page.locator('main')).first()).toBeVisible({timeout:60_000});
      if (await credentials.isVisible()) await credentials.click();
      if (await username.isVisible()) {
        if (new URL(page.url()).origin !== origin) throw new Error('Unexpected authentication origin.');
        const password = process.env.ENABLON_PASSWORD;
        if (!password) throw new Error('Set ENABLON_PASSWORD in this terminal.');
        await username.fill(process.env.ENABLON_USERNAME ?? 'eventsupervisor');
        await page.getByRole('textbox', {name:'Password', exact:true}).fill(password);
        await page.getByRole('button', {name:'Sign In', exact:true}).click();
        const rejected = page.getByText('Login failed', {exact:true});
        await expect.poll(async () => {
          if (await rejected.isVisible()) return 'rejected';
          const current = new URL(page.url());
          return current.origin === origin && current.pathname.startsWith('/fortescue.uat/') ? 'authenticated' : 'pending';
        }, {timeout:60_000}).not.toBe('pending');
        if (await rejected.isVisible()) throw new Error('Login failed. No retry attempted.');
      }
      await page.goto(url, {waitUntil:'domcontentloaded'});
      if (new URL(page.url()).origin !== origin) throw new Error('Unexpected module origin.');
      await expect(page.locator('main')).toBeVisible();
      await expect(page.getByText(module.marker, {exact:false}).first()).toBeVisible();
      await expect(page.getByText('Profile:', {exact:false})).toBeVisible();
      await testInfo.attach(code + '-context', {body: JSON.stringify({module:module.name, title:await page.title(), url:page.url().split('?')[0]}), contentType:'application/json'});
    });
  }
}

