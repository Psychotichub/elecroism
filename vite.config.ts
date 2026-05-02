import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
  plugins: [react()],
  build: {
    rollupOptions: {
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
})
