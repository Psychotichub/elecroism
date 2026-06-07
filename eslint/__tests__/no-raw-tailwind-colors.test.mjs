import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import { noRawTailwindColors } from '../no-raw-tailwind-colors.mjs';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('no-raw-tailwind-colors', () => {
  it('enforces palette ban outside components/ui', () => {
    ruleTester.run('no-raw-tailwind-colors', noRawTailwindColors, {
      valid: [
        {
          filename: 'src/components/ui/Button.tsx',
          code: '<button className="bg-blue-600 text-white" />',
        },
        {
          filename: 'src/components/Panels/Panel.tsx',
          code: '<div className="bg-es-chrome2 text-es-primary" />',
        },
        {
          filename: 'src/components/Panels/Panel.tsx',
          code: 'const c = cn("bg-es-accent", active && "text-es-bright"); <div className={c} />',
        },
      ],
      invalid: [
        {
          filename: 'src/components/Panels/Panel.tsx',
          code: '<div className="bg-blue-600 text-white" />',
          errors: [{ messageId: 'banned' }],
        },
        {
          filename: 'src/components/Toolbar/Menu.tsx',
          code: '<button className={`px-2 ${active ? "bg-blue-600" : "bg-es-hover"}`} />',
          errors: [{ messageId: 'banned' }],
        },
        {
          filename: 'src/gallery/UiGallery.tsx',
          code: '<span className="text-red-400" />',
          errors: [{ messageId: 'banned' }],
        },
      ],
    });
  });
});
