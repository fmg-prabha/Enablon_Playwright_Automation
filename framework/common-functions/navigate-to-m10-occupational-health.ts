import { type Page } from '@playwright/test';
import { navigateToModule } from './navigate-to-module';

/** Navigate to M10 Occupational Health in an authenticated Enablon session. */
export async function navigateToM10OccupationalHealth(page: Page): Promise<void> {
  await navigateToModule(page, 'M10', ['Occupational Health']);
}

