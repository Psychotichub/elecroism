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

## CI

- `smoke-electron` job on **Windows** for every push/PR
- `smoke-electron-mac` on **release tags** only (optional macOS coverage)
