import { type Page } from '@playwright/test';
import { navigateToModule } from './navigate-to-module';

/** Navigate to M11 Obligations in an authenticated Enablon session. */
export async function navigateToM11ObligationsCompliance(page: Page): Promise<void> {
  await navigateToModule(page, 'M11', ['Obligations', 'Compliance']);
}

