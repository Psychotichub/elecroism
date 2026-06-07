# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-gallery.spec.ts >> UI gallery visual regression >> dialog — dark
- Location: e2e\visual-gallery.spec.ts:33:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'dark theme', exact: true })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - heading "ElectroSim UI Gallery" [level=1] [ref=e6]
      - paragraph [ref=e7]: Shell chrome reference for visual regression (menu, toolbar, inspector, dialog).
    - group "Gallery theme" [ref=e8]:
      - button "Dark theme" [pressed] [ref=e9] [cursor=pointer]
      - button "Light theme" [ref=e10] [cursor=pointer]
  - main [ref=e11]:
    - generic [ref=e12]:
      - heading "Menu bar" [level=2] [ref=e13]
      - menubar [ref=e14]:
        - menuitem "File" [ref=e15] [cursor=pointer]
        - menuitem "Edit" [ref=e16] [cursor=pointer]
        - menuitem "View" [ref=e17] [cursor=pointer]
        - menuitem "Simulate" [ref=e18] [cursor=pointer]
        - menuitem "Insert" [ref=e19] [cursor=pointer]
        - menuitem "Window" [ref=e20] [cursor=pointer]
        - menuitem "Help" [ref=e21] [cursor=pointer]
        - generic [ref=e22]:
          - img [ref=e23]
          - generic [ref=e26]: ElectroSim
    - generic [ref=e27]:
      - heading "Toolbar" [level=2] [ref=e28]
      - generic [ref=e29]:
        - toolbar "Drawing tools" [ref=e30]:
          - button "Select" [pressed] [ref=e31] [cursor=pointer]:
            - generic [ref=e32]: Select
          - button "Wire" [ref=e33] [cursor=pointer]:
            - generic [ref=e34]: Wire
          - button "Delete" [ref=e35] [cursor=pointer]:
            - generic [ref=e36]: Delete
          - button "Pan" [ref=e37] [cursor=pointer]:
            - generic [ref=e38]: Pan
        - button "Simulate" [ref=e40] [cursor=pointer]
    - generic [ref=e41]:
      - heading "Inspector" [level=2] [ref=e42]
      - generic [ref=e43]:
        - tablist "Inspector panels" [ref=e44]:
          - generic [ref=e45]:
            - tab "Properties" [selected] [ref=e46] [cursor=pointer]
            - tab "Validation" [ref=e47] [cursor=pointer]:
              - text: Validation
              - generic [ref=e49]: "2"
            - tab "Layers" [ref=e50] [cursor=pointer]
        - generic [ref=e51]:
          - generic [ref=e52]:
            - generic [ref=e53]:
              - paragraph [ref=e54]: Q1
              - paragraph [ref=e56]: MCB — Miniature circuit breaker
            - generic [ref=e57]:
              - generic [ref=e58]: Power
              - generic [ref=e60]: Energized
          - generic [ref=e61]:
            - text: Label
            - textbox "Label" [ref=e62]: Q1
    - generic [ref=e63]:
      - heading "Dialog" [level=2] [ref=e64]
      - dialog "Project settings" [ref=e66]:
        - generic [ref=e67]:
          - generic [ref=e68]:
            - heading "Project settings" [level=2] [ref=e69]
            - button "Close dialog" [ref=e70] [cursor=pointer]:
              - img [ref=e72]
          - generic [ref=e75]:
            - paragraph [ref=e76]: Title block and revision defaults for PDF export.
            - textbox "Drawing number" [ref=e77]: EL-100
          - generic [ref=e78]:
            - button "Cancel" [ref=e79] [cursor=pointer]
            - button "Save" [ref=e80] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const THEMES = ['dark', 'light'] as const;
  4  | 
  5  | const THEME_BUTTON: Record<(typeof THEMES)[number], string> = {
  6  |   dark: 'Dark theme',
  7  |   light: 'Light theme',
  8  | };
  9  | 
  10 | test.describe('UI gallery visual regression', () => {
  11 |   test.beforeEach(async ({ page }) => {
  12 |     await page.goto('/gallery.html');
  13 |     await expect(page.getByTestId('ui-gallery-root')).toBeVisible();
  14 |   });
  15 | 
  16 |   for (const theme of THEMES) {
  17 |     test(`menu bar — ${theme}`, async ({ page }) => {
  18 |       await page.getByRole('button', { name: THEME_BUTTON[theme], exact: true }).click();
  19 |       await expect(page.getByTestId('gallery-menu')).toHaveScreenshot(
  20 |         `menu-bar-${theme}.png`
  21 |       );
  22 |     });
  23 | 
  24 |     test(`toolbar — ${theme}`, async ({ page }) => {
  25 |       await page.getByRole('button', { name: THEME_BUTTON[theme], exact: true }).click();
  26 |       await expect(page.getByTestId('gallery-toolbar')).toHaveScreenshot(
  27 |         `toolbar-${theme}.png`
  28 |       );
  29 |     });
  30 | 
  31 |     test(`inspector — ${theme}`, async ({ page }) => {
  32 |       await page.getByRole('button', { name: THEME_BUTTON[theme], exact: true }).click();
  33 |       await expect(page.getByTestId('gallery-inspector')).toHaveScreenshot(
> 34 |         `inspector-${theme}.png`
     |                                                                               ^ Error: locator.click: Test timeout of 60000ms exceeded.
  35 |       );
  36 |     });
  37 | 
  38 |     test(`dialog — ${theme}`, async ({ page }) => {
  39 |       await page.getByRole('button', { name: THEME_BUTTON[theme], exact: true }).click();
  40 |       await expect(page.getByTestId('gallery-dialog')).toHaveScreenshot(
  41 |         `dialog-${theme}.png`
  42 |       );
  43 |     });
  44 |   }
  45 | });
  46 | 
```