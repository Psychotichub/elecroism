import type { Theme } from '../store/themeStore';
import { getCanvasTokens } from './tokens';

export type CanvasInteractionColors = {
  selection: string;
  selectionFill: string;
  marqueeCrossing: string;
  marqueeCrossingFill: string;
  wirePreviewValid: string;
  wirePreviewValidFill: string;
  wirePreviewWarning: string;
  wirePreviewWarningFill: string;
  wirePreviewInvalid: string;
  wirePreviewInvalidFill: string;
  wirePreviewBend: string;
  wirePreviewBendFill: string;
  wireHitTarget: string;
  wireHoverTerminal: string;
  wireHoverTerminalFill: string;
  wireDockAligned: string;
  wireDockAlignedFill: string;
  wireDockPending: string;
  wireDockPendingFill: string;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;
  const n = Number.parseInt(value, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function buildCanvasInteractionColors(
  theme: Theme
): CanvasInteractionColors {
  const tokens = getCanvasTokens(theme);
  const { selection, success, warning, error } = tokens;

  return {
    selection,
    selectionFill: withAlpha(selection, theme === 'light' ? 0.14 : 0.12),
    marqueeCrossing: success,
    marqueeCrossingFill: withAlpha(success, theme === 'light' ? 0.16 : 0.12),
    wirePreviewValid: success,
    wirePreviewValidFill: withAlpha(success, theme === 'light' ? 0.18 : 0.12),
    wirePreviewWarning: warning,
    wirePreviewWarningFill: withAlpha(warning, theme === 'light' ? 0.2 : 0.14),
    wirePreviewInvalid: error,
    wirePreviewInvalidFill: withAlpha(error, theme === 'light' ? 0.16 : 0.12),
    wirePreviewBend: warning,
    wirePreviewBendFill: withAlpha(warning, theme === 'light' ? 0.18 : 0.14),
    wireHitTarget: withAlpha(selection, 0.06),
    wireHoverTerminal: success,
    wireHoverTerminalFill: withAlpha(success, theme === 'light' ? 0.14 : 0.08),
    wireDockAligned: success,
    wireDockAlignedFill: withAlpha(success, theme === 'light' ? 0.2 : 0.18),
    wireDockPending: warning,
    wireDockPendingFill: withAlpha(warning, theme === 'light' ? 0.2 : 0.18),
  };
}

let activeColors = buildCanvasInteractionColors('dark');

export function setCanvasInteractionTheme(theme: Theme): void {
  activeColors = buildCanvasInteractionColors(theme);
}

export function getCanvasInteractionColors(): CanvasInteractionColors {
  return activeColors;
}
