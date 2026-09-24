import { type Page } from '@playwright/test';
import { navigateToModule } from './navigate-to-module';

/** Navigate to M07 HERO App in an authenticated Enablon session. */
export async function navigateToM07HeroApp(page: Page): Promise<void> {
  await navigateToModule(page, 'M07', ['HERO App', 'HERO', 'HERO Mobile Application']);
}

