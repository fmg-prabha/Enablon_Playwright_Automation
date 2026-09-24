import { type Page } from '@playwright/test';
import { navigateToModule } from './navigate-to-module';

/** Navigate to M15 Heritage in an authenticated Enablon session. */
export async function navigateToM15Heritage(page: Page): Promise<void> {
  await navigateToModule(page, 'M15', ['Heritage']);
}

