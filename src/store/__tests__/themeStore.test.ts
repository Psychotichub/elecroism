import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { themeColors, themeLabel, useThemeStore } from '../themeStore'

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
    vi.stubGlobal('window', { localStorage: storage })
    useThemeStore.setState({ theme: 'dark' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('cycles dark → light → high-contrast → dark', () => {
    useThemeStore.setState({ theme: 'dark' })
    useThemeStore.getState().cycleTheme()
    expect(useThemeStore.getState().theme).toBe('light')
    useThemeStore.getState().cycleTheme()
    expect(useThemeStore.getState().theme).toBe('high-contrast')
    useThemeStore.getState().cycleTheme()
    expect(useThemeStore.getState().theme).toBe('dark')
  })

  it('persists theme to localStorage', () => {
    useThemeStore.getState().setTheme('high-contrast')
    expect(window.localStorage.getItem(THEME_KEY)).toBe('high-contrast')
    expect(useThemeStore.getState().theme).toBe('high-contrast')
  })

  it('exposes semantic palette tokens', () => {
    expect(themeColors.dark.toolbar).toContain('es-chrome1')
    expect(themeColors['high-contrast'].canvasHex).toBe('#000000')
    expect(themeLabel('high-contrast')).toBe('High contrast')
  })
})
