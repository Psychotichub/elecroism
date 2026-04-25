import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: 'dark',
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'dark' ? 'light' : 'dark',
    })),
  setTheme: (theme) => set({ theme }),
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
} as const;
