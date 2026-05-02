/**
 * electron-builder fails with "Access is denied" on d3dcompiler_47.dll when
 * release/win-unpacked is still in use (ElectroSim.exe running, AV scan, etc.).
 * Remove the folder before packaging so the error is ours to explain, or it succeeds.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const target = path.join(root, 'release', 'win-unpacked');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!fs.existsSync(target)) return;

  const attempts = 5;
  for (let i = 0; i < attempts; i++) {
    try {
      fs.rmSync(target, { recursive: true, force: true });
      return;
    } catch (err) {
      if (i === attempts - 1) {
        console.error(
          '\nCould not remove release/win-unpacked (files are locked).\n' +
            'Close ElectroSim.exe if it is running from that folder, close any Explorer\n' +
            'window showing release/win-unpacked, then run npm run build:desktop again.\n'
        );
        console.error(String(err && err.message ? err.message : err));
        process.exit(1);
      }
      await sleep(400 * (i + 1));
    }
  }
}

await main();
