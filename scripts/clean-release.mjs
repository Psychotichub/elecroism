/**
 * Remove stale electron-builder output folders before packaging.
 * Locked files (running app, AV scan) cause opaque "Access is denied" errors on Windows.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const releaseDir = path.join(path.resolve(__dirname, '..'), 'release');

const STALE_DIRS = ['win-unpacked', 'linux-unpacked', 'mac'];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function removeDir(target) {
  if (!fs.existsSync(target)) return;

  const attempts = 5;
  for (let i = 0; i < attempts; i++) {
    try {
      fs.rmSync(target, { recursive: true, force: true });
      return;
    } catch (err) {
      if (i === attempts - 1) {
        console.error(
          `\nCould not remove ${path.relative(process.cwd(), target)} (files are locked).\n` +
            'Close any running ElectroSim build from release/, close Explorer windows\n' +
            'showing that folder, then run build:desktop again.\n'
        );
        console.error(String(err && err.message ? err.message : err));
        process.exit(1);
      }
      await sleep(400 * (i + 1));
    }
  }
}

async function main() {
  if (!fs.existsSync(releaseDir)) return;
  for (const dir of STALE_DIRS) {
    await removeDir(path.join(releaseDir, dir));
  }
}

await main();
