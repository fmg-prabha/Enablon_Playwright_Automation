import { type Page } from '@playwright/test';
import { navigateToModule } from './navigate-to-module';

/** Navigate to M03 Audit in an authenticated Enablon session. */
export async function navigateToM03Audit(page: Page): Promise<void> {
  await navigateToModule(page, 'M03', ['Audit']);
}

