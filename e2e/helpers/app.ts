import path from 'node:path';
import { fileURLToPath } from 'node:url';
import electronPath from 'electron';
import {
  _electron as electron,
  type ElectronApplication,
  type Page,
} from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(__dirname, '../..');

export async function launchElectroSim(): Promise<{
  app: ElectronApplication;
  page: Page;
}> {
  if (!process.env.CI && !process.env.SMOKE_SKIP_BUILD_CHECK) {
    const fs = await import('node:fs');
    const distIndex = path.join(projectRoot, 'dist', 'index.html');
    if (!fs.existsSync(distIndex)) {
      throw new Error(
        'Production build missing. Run `npm run build` before `npm run test:smoke`.'
      );
    }
  }

  const app = await electron.launch({
    executablePath: electronPath as unknown as string,
    args: [projectRoot],
    cwd: projectRoot,
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
      NODE_ENV: 'production',
    },
  });

  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  return { app, page };
}

export async function dismissRestoreDialogIfPresent(page: Page): Promise<void> {
  const startFresh = page.getByRole('button', { name: 'Start fresh' });
  try {
    await startFresh.waitFor({ state: 'visible', timeout: 4_000 });
    await startFresh.click();
  } catch {
    // No restore dialog — fresh session.
  }
}

/** Open a nested item in the in-app menu bar (hover submenus, click leaf). */
export async function chooseMenuPath(
  page: Page,
  ...labels: string[]
): Promise<void> {
  if (labels.length === 0) return;
  await page.getByRole('menubar').getByRole('menuitem', { name: labels[0] }).click();
  for (let i = 1; i < labels.length - 1; i++) {
    await page.getByRole('menuitem', { name: labels[i] }).hover();
  }
  await page.getByRole('menuitem', { name: labels[labels.length - 1] }).click();
}

export async function waitForComponentCount(
  page: Page,
  minCount: number
): Promise<void> {
  await page.waitForFunction(
    (min) => {
      const match = document.body.innerText.match(/Components:\s*(\d+)/);
      return match != null && Number(match[1]) >= min;
    },
    minCount,
    { timeout: 30_000 }
  );
}

export async function waitForSimulatedPower(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const match = document.body.innerText.match(/(\d+(?:\.\d+)?)W/);
    return match != null && Number(match[1]) > 0;
  });
}
