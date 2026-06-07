/// <reference types="vitest/config" />
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ')

/** Inject a strict CSP meta tag into the packaged Electron renderer HTML. */
function electronProductionCsp(): Plugin {
  return {
    name: 'electron-production-csp',
    apply: 'build',
    transformIndexHtml(html) {
      const tag = `<meta http-equiv="Content-Security-Policy" content="${PRODUCTION_CSP}" />`
      return html.replace('<head>', `<head>\n    ${tag}`)
    },
  }
}

function manualChunkFromNodeModules(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined
  const m = id.replace(/\\/g, '/')
  if (m.includes('/react-dom/')) return 'react-dom'
  if (m.includes('/react/')) return 'react-core'
  if (m.includes('/konva/') || m.includes('/react-konva/')) return 'konva'
  if (m.includes('/mathjs/')) return 'mathjs'
  if (m.includes('/react-icons/')) return 'react-icons'
  if (m.includes('/zustand/') || m.includes('/uuid/') || m.includes('/clsx/')) {
    return 'misc-vendor'
  }
  return 'vendor'
}

// https://vite.dev/config/
export default defineConfig({
  /** Required for Electron `loadFile(dist/index.html)` — absolute `/assets/…` breaks under `file://`. */
  base: './',
  plugins: [react(), electronProductionCsp()],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        gallery: path.resolve(__dirname, 'gallery.html'),
      },
      output: {
        manualChunks(id) {
          return manualChunkFromNodeModules(id)
        },
      },
    },
  },
  server: {
    watch: {
      // More reliable in OneDrive/Windows paths where fs events are flaky
      usePolling: true,
      interval: 200,
      awaitWriteFinish: {
        stabilityThreshold: 120,
        pollInterval: 100,
      },
    },
    hmr: {
      overlay: true,
    },
  },
  test: {
    setupFiles: ['./src/test/setupDom.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**', '**/*.perf.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/simulation/**/*.ts',
        'src/utils/**/*.ts',
        'src/examples/**/*.ts',
        'src/store/circuitHistory.ts',
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/**/__tests__/**',
        'src/simulation/simulationWorker.ts',
        'src/simulation/simulationClient.ts',
      ],
      thresholds: {
        'src/simulation/**': {
          lines: 68,
          functions: 65,
          branches: 55,
          statements: 65,
        },
        'src/utils/**': {
          lines: 38,
          functions: 38,
          branches: 28,
          statements: 36,
        },
        'src/examples/**': {
          lines: 95,
          functions: 100,
          branches: 80,
          statements: 95,
        },
      },
    },
  },
})
