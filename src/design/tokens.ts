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
    success: string;
    warning: string;
    error: string;
    hintBubbleFill: string;
    hintBubbleStroke: string;
    hintText: string;
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
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    hintBubbleFill: 'rgba(37, 40, 50, 0.94)',
    hintBubbleStroke: 'rgba(59, 130, 246, 0.45)',
    hintText: '#e8eaed',
  },
  light: {
    canvasHex: '#f4f5f7',
    gridDot: '#d1d5db',
    scrollTrack: '#f1f5f9',
    scrollThumb: '#cbd5e1',
    scrollThumbHover: '#94a3b8',
    accent: '#2563eb',
    selection: '#2563eb',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    hintBubbleFill: 'rgba(255, 255, 255, 0.96)',
    hintBubbleStroke: 'rgba(37, 99, 235, 0.28)',
    hintText: '#334155',
  },
  'high-contrast': {
    canvasHex: '#000000',
    gridDot: '#ffffff',
    scrollTrack: '#000000',
    scrollThumb: '#ffff00',
    scrollThumbHover: '#ffffff',
    accent: '#ffff00',
    selection: '#ffff00',
    success: '#00ff00',
    warning: '#ffaa00',
    error: '#ff4444',
    hintBubbleFill: 'rgba(0, 0, 0, 0.92)',
    hintBubbleStroke: '#ffff00',
    hintText: '#ffffff',
  },
};

export function getCanvasTokens(theme: Theme) {
  return CANVAS_THEME_TOKENS[theme];
}
