import { test, expect } from '@playwright/test';
import {
  chooseMenuPath,
  dismissRestoreDialogIfPresent,
  launchElectroSim,
  waitForComponentCount,
  waitForSimulatedPower,
} from './helpers/app';

test.describe('Electron UI smoke', () => {
  test('launch, load example, simulate, export PNG', async () => {
    const { app, page } = await launchElectroSim();

    try {
      await dismissRestoreDialogIfPresent(page);

      await expect(page.getByRole('menubar')).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'File' })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'Simulate' })).toBeVisible();

      await chooseMenuPath(
        page,
        'Insert',
        'Examples',
        'Lighting',
        'Simple Lighting Circuit'
      );

      await waitForComponentCount(page, 3);
      await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 });

      await chooseMenuPath(page, 'Simulate', 'Run simulation');
      await waitForSimulatedPower(page);

      let alertMessage: string | null = null;
      page.on('dialog', async (dialog) => {
        alertMessage = dialog.message();
        await dialog.accept();
      });

      await chooseMenuPath(page, 'File', 'Export PNG…');
      await page.waitForTimeout(1_500);

      expect(alertMessage).toBeNull();
      await expect(page.locator('canvas').first()).toBeVisible();
    } finally {
      await app.close();
    }
  });
});
