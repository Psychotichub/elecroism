import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
