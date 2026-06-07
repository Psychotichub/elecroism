import { test, expect } from '@playwright/test';

const THEMES = ['dark', 'light'] as const;

const THEME_BUTTON: Record<(typeof THEMES)[number], string> = {
  dark: 'Dark theme',
  light: 'Light theme',
};

test.describe('UI gallery visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/gallery.html');
    await expect(page.getByTestId('ui-gallery-root')).toBeVisible();
  });

  for (const theme of THEMES) {
    test(`menu bar — ${theme}`, async ({ page }) => {
      await page.getByRole('button', { name: THEME_BUTTON[theme], exact: true }).click();
      await expect(page.getByTestId('gallery-menu')).toHaveScreenshot(
        `menu-bar-${theme}.png`
      );
    });

    test(`toolbar — ${theme}`, async ({ page }) => {
      await page.getByRole('button', { name: THEME_BUTTON[theme], exact: true }).click();
      await expect(page.getByTestId('gallery-toolbar')).toHaveScreenshot(
        `toolbar-${theme}.png`
      );
    });

    test(`inspector — ${theme}`, async ({ page }) => {
      await page.getByRole('button', { name: THEME_BUTTON[theme], exact: true }).click();
      await expect(page.getByTestId('gallery-inspector')).toHaveScreenshot(
        `inspector-${theme}.png`
      );
    });

    test(`dialog — ${theme}`, async ({ page }) => {
      await page.getByRole('button', { name: THEME_BUTTON[theme], exact: true }).click();
      await expect(page.getByTestId('gallery-dialog')).toHaveScreenshot(
        `dialog-${theme}.png`
      );
    });
  }
});
