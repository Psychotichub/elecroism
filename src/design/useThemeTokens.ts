import { useMemo } from 'react';
import { getCanvasTokens } from './tokens';
import { themeColors, useThemeStore, type Theme } from '../store/themeStore';

/** Semantic Tailwind class bundles + canvas hex for the active theme. */
export function useThemeTokens() {
  const theme = useThemeStore((s) => s.theme);
  return useMemo(() => buildThemeTokens(theme), [theme]);
}

export function buildThemeTokens(theme: Theme) {
  return {
    theme,
    classes: themeColors[theme],
    canvas: getCanvasTokens(theme),
  };
}
