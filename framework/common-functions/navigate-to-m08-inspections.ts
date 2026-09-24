import { type Page } from '@playwright/test';
import { navigateToModule } from './navigate-to-module';

/** Navigate to M08 Inspections in an authenticated Enablon session. */
export async function navigateToM08Inspections(page: Page): Promise<void> {
  await navigateToModule(page, 'M08', ['Inspections']);
}

