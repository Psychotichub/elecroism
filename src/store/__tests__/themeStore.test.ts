import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  preferenceLabel,
  resolveTheme,
  themeColors,
  themeLabel,
  useThemeStore,
} from '../themeStore'

const THEME_KEY = 'electroism.theme.v1'

function createStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
    clear: () => {
      map.clear()
    },
  }
}

describe('themeStore', () => {
  beforeEach(() => {
    const storage = createStorage()
    vi.stubGlobal('window', {
      localStorage: storage,
      matchMedia: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
      electronAPI: undefined,
    })
    useThemeStore.setState({ preference: 'dark', theme: 'dark' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to system preference on first launch', () => {
    useThemeStore.setState({
      preference: 'system',
      theme: resolveTheme('system'),
    })
    expect(useThemeStore.getState().preference).toBe('system')
    expect(useThemeStore.getState().theme).toBe('dark')
  })

  it('cycles dark → light → high-contrast → system → dark', () => {
    useThemeStore.setState({ preference: 'dark', theme: 'dark' })
    useThemeStore.getState().cycleTheme()
    expect(useThemeStore.getState().preference).toBe('light')
    useThemeStore.getState().cycleTheme()
    expect(useThemeStore.getState().preference).toBe('high-contrast')
    useThemeStore.getState().cycleTheme()
    expect(useThemeStore.getState().preference).toBe('system')
    useThemeStore.getState().cycleTheme()
    expect(useThemeStore.getState().preference).toBe('dark')
  })

  it('persists theme preference to localStorage', () => {
    useThemeStore.getState().setTheme('high-contrast')
    expect(window.localStorage.getItem(THEME_KEY)).toBe('high-contrast')
    expect(useThemeStore.getState().preference).toBe('high-contrast')
    expect(useThemeStore.getState().theme).toBe('high-contrast')
  })

  it('syncs resolved theme when preference is system', () => {
    useThemeStore.getState().setTheme('system')
    vi.stubGlobal('window', {
      localStorage: window.localStorage,
      matchMedia: vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
      electronAPI: undefined,
    })
    useThemeStore.getState().syncSystemTheme()
    expect(useThemeStore.getState().theme).toBe('light')
  })

  it('exposes semantic palette tokens', () => {
    expect(themeColors.dark.toolbar).toContain('es-chrome1')
    expect(themeColors['high-contrast'].canvasHex).toBe('#000000')
    expect(themeLabel('high-contrast')).toBe('High contrast')
    expect(preferenceLabel('system')).toBe('Match system')
  })
})
