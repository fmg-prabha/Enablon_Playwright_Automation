import { type Page } from '@playwright/test';
import { navigateToModule } from './navigate-to-module';

/** Navigate to M14 Meetings in an authenticated Enablon session. */
export async function navigateToM14Meetings(page: Page): Promise<void> {
  await navigateToModule(page, 'M14', ['Meetings']);
}

