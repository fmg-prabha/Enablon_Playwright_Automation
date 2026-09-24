import { type Page } from '@playwright/test';
import { navigateToModule } from './navigate-to-module';

/** Navigate to M04 Contractor Management in an authenticated Enablon session. */
export async function navigateToM04ContractorManagement(page: Page): Promise<void> {
  await navigateToModule(page, 'M04', ['Contractor Management', 'CSM']);
}

