import { create } from 'zustand';
import { getCanvasTokens } from '../design/tokens';

export type Theme = 'dark' | 'light' | 'high-contrast';

const THEME_KEY = 'electroism.theme.v1';
const THEME_ORDER: Theme[] = ['dark', 'light', 'high-contrast'];

function loadTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'high-contrast' || v === 'dark') return v;
  } catch {
    // ignore
  }
  return 'dark';
}

function saveTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
}

interface ThemeStore {
  theme: Theme;
  cycleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: loadTheme(),
  cycleTheme: () =>
    set((state) => {
      const idx = THEME_ORDER.indexOf(state.theme);
      const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length] ?? 'dark';
      saveTheme(next);
      return { theme: next };
    }),
  setTheme: (theme) => {
    saveTheme(theme);
    set({ theme });
  },
}));

function chromeClasses(theme: Theme) {
  const canvas = getCanvasTokens(theme);
  return {
    bg: 'bg-es-app',
    sidebar: 'bg-es-chrome2',
    toolbar: 'bg-es-chrome1',
    panel: 'bg-es-chrome2',
    canvas: 'bg-es-canvas',
    canvasHex: canvas.canvasHex,
    gridDot: canvas.gridDot,
    border: 'border-es-borderSubtle',
    text: 'text-es-primary',
    textMuted: 'text-es-secondary',
    textBright: 'text-es-bright',
    groupLabel: 'text-es-label',
    itemHover: 'hover:bg-es-hover',
    btnBg: 'bg-es-btnSecondary',
    btnHover: 'hover:bg-es-btnSecondaryHover',
    btnText: 'text-es-primary',
    inputBg: 'bg-es-inputBg',
    inputBorder: 'border-es-inputBorder',
    inputText: 'text-es-primary',
    scrollTrack: canvas.scrollTrack,
    scrollThumb: canvas.scrollThumb,
    scrollThumbHover: canvas.scrollThumbHover,
  };
}

export const themeColors = {
  dark: chromeClasses('dark'),
  light: chromeClasses('light'),
  'high-contrast': chromeClasses('high-contrast'),
} as const;

export function themeLabel(theme: Theme): string {
  switch (theme) {
    case 'light':
      return 'Light';
    case 'high-contrast':
      return 'High contrast';
    default:
      return 'Dark';
  }
}

/** True when UI should use dark-surface utility branches (dark + high-contrast). */
export function isDarkSurface(theme: Theme): boolean {
  return theme !== 'light';
}
