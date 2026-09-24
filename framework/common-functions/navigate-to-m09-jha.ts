import { type Page } from '@playwright/test';
import { navigateToModule } from './navigate-to-module';

/** Navigate to M09 JHA in an authenticated Enablon session. */
export async function navigateToM09Jha(page: Page): Promise<void> {
  await navigateToModule(page, 'M09', ['JHA', 'Job Hazard Analysis']);
}

