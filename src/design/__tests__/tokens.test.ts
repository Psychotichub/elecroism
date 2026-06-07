import { describe, expect, it } from 'vitest';
import { CANVAS_THEME_TOKENS, getCanvasTokens } from '../tokens';
import { buildThemeTokens } from '../useThemeTokens';
import { themeColors } from '../../store/themeStore';

describe('design tokens', () => {
  it('provides canvas hex per theme', () => {
    expect(getCanvasTokens('dark').canvasHex).toBe('#1a1d24');
    expect(getCanvasTokens('light').canvasHex).toBe('#f4f5f7');
    expect(getCanvasTokens('high-contrast').canvasHex).toBe('#000000');
  });

  it('keeps grid dot tokens aligned with canvas themes', () => {
    expect(getCanvasTokens('dark').gridDot).toBe('#4b5563');
    expect(getCanvasTokens('light').gridDot).toBe('#d1d5db');
    expect(themeColors.dark.gridDot).toBe(CANVAS_THEME_TOKENS.dark.gridDot);
  });

  it('provides validation hint callout colors per theme', () => {
    expect(getCanvasTokens('dark').hintBubbleFill).toContain('rgba');
    expect(getCanvasTokens('light').hintText).toBe('#334155');
  });

  it('keeps themeColors canvas hex in sync with canvas tokens', () => {
    for (const theme of ['dark', 'light', 'high-contrast'] as const) {
      expect(themeColors[theme].canvasHex).toBe(
        CANVAS_THEME_TOKENS[theme].canvasHex
      );
    }
  });

  it('buildThemeTokens bundles classes and canvas', () => {
    const t = buildThemeTokens('dark');
    expect(t.theme).toBe('dark');
    expect(t.classes.toolbar).toContain('es-chrome1');
    expect(t.canvas.accent).toBe('#3b82f6');
  });
});
