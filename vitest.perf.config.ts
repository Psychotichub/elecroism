import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/** Vitest config for performance benchmarks (not part of default `npm test`). */
export default defineConfig({
  plugins: [react()],
  test: {
    setupFiles: ['./src/test/setupDom.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
});
