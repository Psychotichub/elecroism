import { create } from 'zustand';
import { getSystemColorScheme, systemSchemeToTheme } from '../design/systemTheme';
import { getCanvasTokens } from '../design/tokens';

export type Theme = 'dark' | 'light' | 'high-contrast';
export type ThemePreference = Theme | 'system';

const THEME_KEY = 'electroism.theme.v1';
const THEME_ORDER: ThemePreference[] = [
  'dark',
  'light',
  'high-contrast',
  'system',
];

function loadPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    if (
      v === 'light' ||
      v === 'high-contrast' ||
      v === 'dark' ||
      v === 'system'
    ) {
      return v;
    }
  } catch {
    // ignore
  }
  return 'system';
}

function savePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_KEY, preference);
  } catch {
    // ignore
  }
}

export function resolveTheme(preference: ThemePreference): Theme {
  if (preference === 'system') {
    return systemSchemeToTheme(getSystemColorScheme());
  }
  return preference;
}

interface ThemeStore {
  preference: ThemePreference;
  theme: Theme;
  cycleTheme: () => void;
  setTheme: (preference: ThemePreference) => void;
  syncSystemTheme: () => void;
}

const initialPreference = loadPreference();

export const useThemeStore = create<ThemeStore>((set) => ({
  preference: initialPreference,
  theme: resolveTheme(initialPreference),
  cycleTheme: () =>
    set((state) => {
      const idx = THEME_ORDER.indexOf(state.preference);
      const next =
        THEME_ORDER[(idx + 1) % THEME_ORDER.length] ?? 'system';
      savePreference(next);
      return { preference: next, theme: resolveTheme(next) };
    }),
  setTheme: (preference) => {
    savePreference(preference);
    set({ preference, theme: resolveTheme(preference) });
  },
  syncSystemTheme: () =>
    set((state) => {
      if (state.preference !== 'system') return state;
      const theme = resolveTheme('system');
      return state.theme === theme ? state : { ...state, theme };
    }),
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

export function preferenceLabel(preference: ThemePreference): string {
  if (preference === 'system') return 'Match system';
  return themeLabel(preference);
}

/** True when UI should use dark-surface utility branches (dark + high-contrast). */
export function isDarkSurface(theme: Theme): boolean {
  return theme !== 'light';
}
