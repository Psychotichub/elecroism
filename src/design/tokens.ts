import type { Theme } from '../store/themeStore';

/** Hex values for Konva / canvas — kept in sync with `tokens.css`. */
export const CANVAS_THEME_TOKENS: Record<
  Theme,
  {
    canvasHex: string;
    gridDot: string;
    scrollTrack: string;
    scrollThumb: string;
    scrollThumbHover: string;
    accent: string;
    selection: string;
  }
> = {
  dark: {
    canvasHex: '#1a1d24',
    gridDot: '#4b5563',
    scrollTrack: '#16161e',
    scrollThumb: '#3d4450',
    scrollThumbHover: '#4b5563',
    accent: '#3b82f6',
    selection: '#3b82f6',
  },
  light: {
    canvasHex: '#f4f5f7',
    gridDot: '#d1d5db',
    scrollTrack: '#f1f5f9',
    scrollThumb: '#cbd5e1',
    scrollThumbHover: '#94a3b8',
    accent: '#2563eb',
    selection: '#2563eb',
  },
  'high-contrast': {
    canvasHex: '#000000',
    gridDot: '#ffffff',
    scrollTrack: '#000000',
    scrollThumb: '#ffff00',
    scrollThumbHover: '#ffffff',
    accent: '#ffff00',
    selection: '#ffff00',
  },
};

export function getCanvasTokens(theme: Theme) {
  return CANVAS_THEME_TOKENS[theme];
}
