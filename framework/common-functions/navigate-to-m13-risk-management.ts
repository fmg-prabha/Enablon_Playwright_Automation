import { type Page } from '@playwright/test';
import { navigateToModule } from './navigate-to-module';

/** Navigate to M13 Risk Management in an authenticated Enablon session. */
export async function navigateToM13RiskManagement(page: Page): Promise<void> {
  await navigateToModule(page, 'M13', ['Risk Management', 'Risk']);
}

