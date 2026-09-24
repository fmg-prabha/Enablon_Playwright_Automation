import { type Page } from '@playwright/test';
import { navigateToModule } from './navigate-to-module';

/** Navigate to M02 Approvals in an authenticated Enablon session. */
export async function navigateToM02Approvals(page: Page): Promise<void> {
  await navigateToModule(page, 'M02', ['Approvals']);
}

