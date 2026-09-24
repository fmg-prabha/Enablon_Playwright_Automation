import { type Page } from '@playwright/test';
import { navigateToModule } from './navigate-to-module';

/** Navigate to M12 Management of Change in an authenticated Enablon session. */
export async function navigateToM12ManagementOfChange(page: Page): Promise<void> {
  await navigateToModule(page, 'M12', ['Management of Change', 'MoC']);
}

