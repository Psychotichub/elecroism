import { create } from 'zustand';

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

export const themeColors = {
  dark: {
    bg: 'bg-gray-900',
    sidebar: 'bg-[#1E1E2E]',
    toolbar: 'bg-[#1E1E2E]',
    panel: 'bg-[#1E1E2E]',
    canvas: 'bg-gray-800',
    canvasHex: '#1F2937',
    gridDot: '#4B5563',
    border: 'border-gray-700',
    text: 'text-gray-300',
    textMuted: 'text-gray-500',
    textBright: 'text-white',
    groupLabel: 'text-gray-400',
    itemHover: 'hover:bg-gray-700/50',
    btnBg: 'bg-gray-700',
    btnHover: 'hover:bg-gray-600',
    btnText: 'text-gray-300',
    inputBg: 'bg-gray-800',
    inputBorder: 'border-gray-600',
    inputText: 'text-gray-200',
    scrollTrack: '#1E1E2E',
    scrollThumb: '#374151',
    scrollThumbHover: '#4B5563',
  },
  light: {
    bg: 'bg-gray-100',
    sidebar: 'bg-white',
    toolbar: 'bg-white',
    panel: 'bg-white',
    canvas: 'bg-gray-50',
    canvasHex: '#F9FAFB',
    gridDot: '#D1D5DB',
    border: 'border-gray-200',
    text: 'text-gray-700',
    textMuted: 'text-gray-400',
    textBright: 'text-gray-900',
    groupLabel: 'text-gray-500',
    itemHover: 'hover:bg-gray-100',
    btnBg: 'bg-gray-200',
    btnHover: 'hover:bg-gray-300',
    btnText: 'text-gray-700',
    inputBg: 'bg-gray-100',
    inputBorder: 'border-gray-300',
    inputText: 'text-gray-800',
    scrollTrack: '#F3F4F6',
    scrollThumb: '#D1D5DB',
    scrollThumbHover: '#9CA3AF',
  },
  'high-contrast': {
    bg: 'bg-black',
    sidebar: 'bg-black',
    toolbar: 'bg-black',
    panel: 'bg-black',
    canvas: 'bg-black',
    canvasHex: '#000000',
    gridDot: '#FFFFFF',
    border: 'border-yellow-400',
    text: 'text-white',
    textMuted: 'text-yellow-200',
    textBright: 'text-yellow-300',
    groupLabel: 'text-yellow-400',
    itemHover: 'hover:bg-yellow-900/50',
    btnBg: 'bg-yellow-500',
    btnHover: 'hover:bg-yellow-400',
    btnText: 'text-black',
    inputBg: 'bg-black',
    inputBorder: 'border-yellow-400',
    inputText: 'text-white',
    scrollTrack: '#000000',
    scrollThumb: '#FFFF00',
    scrollThumbHover: '#FFFFFF',
  },
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
