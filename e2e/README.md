# Electron UI smoke tests (E1)

Thin Playwright layer over the packaged renderer launched inside Electron.

## Prerequisites

```bash
npm run build:renderer
npm run test:smoke:install
```

## Run locally

```bash
npm run build:renderer
npm run test:smoke
```

## What is covered

1. Launch ElectroSim (production `dist/` build, not the Vite dev server)
2. Dismiss restore-session dialog when present
3. **Insert → Examples → Lighting → Simple Lighting Circuit**
4. **Simulate → Run simulation** — status bar shows load power
5. **File → Export PNG…** — no “canvas not ready” alert; Konva canvas present

## UI gallery / visual regression (F1)

Static shell chrome gallery for screenshot baselines (menu, toolbar, inspector, dialog — dark + light).

```bash
npm run gallery:dev          # local Vite page at /gallery.html
npm run build:renderer
npm run test:visual:install  # Chromium only
npm run test:visual          # compare Playwright screenshots
npm run test:visual:update   # refresh baselines after intentional UI changes
```

Snapshots live under `e2e/visual-gallery.spec.ts-snapshots/`.

## CI

- `smoke-electron` job on **Windows** for every push/PR
- `visual-regression` on **Ubuntu** (optional gate, `continue-on-error`) — UI gallery screenshots
- `smoke-electron-mac` on **release tags** only (optional macOS coverage)
