import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { noRawTailwindColors } from './eslint/no-raw-tailwind-colors.mjs'

/** Legacy surfaces still on raw Tailwind palette — remove paths as panels migrate to es-* tokens. */
const LEGACY_RAW_COLOR_PATHS = [
  'src/App.tsx',
  'src/components/Canvas/**',
  'src/components/Dialogs/**',
  'src/components/ErrorBoundary/**',
  'src/components/Panels/**',
  'src/components/Pwa/**',
  'src/components/Toolbar/**',
]

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright.config.ts', 'playwright.visual.config.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/*.test.ts', '**/__tests__/**'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
    },
  },
  {
    files: ['src/__tests__/electronSecurity.test.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/components/ui/**',
      '**/*.test.ts',
      '**/__tests__/**',
      ...LEGACY_RAW_COLOR_PATHS,
    ],
    plugins: {
      electroism: {
        rules: {
          'no-raw-tailwind-colors': noRawTailwindColors,
        },
      },
    },
    rules: {
      'electroism/no-raw-tailwind-colors': 'error',
    },
  },
])
