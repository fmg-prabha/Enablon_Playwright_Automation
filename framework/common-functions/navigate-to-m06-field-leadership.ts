import { type Page } from '@playwright/test';
import { navigateToModule } from './navigate-to-module';

/** Navigate to M06 Field Leadership in an authenticated Enablon session. */
export async function navigateToM06FieldLeadership(page: Page): Promise<void> {
  await navigateToModule(page, 'M06', ['Field Leadership']);
}

