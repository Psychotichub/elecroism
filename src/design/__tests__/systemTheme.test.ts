import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSystemColorScheme,
  subscribeSystemColorScheme,
  systemSchemeToTheme,
} from '../systemTheme';
import { resolveTheme } from '../../store/themeStore';

describe('systemTheme', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
      electronAPI: undefined,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps system preference to dark when OS prefers dark', () => {
    expect(getSystemColorScheme()).toBe('dark');
    expect(resolveTheme('system')).toBe('dark');
    expect(systemSchemeToTheme('dark')).toBe('dark');
  });

  it('maps system preference to light when OS prefers light', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    expect(getSystemColorScheme()).toBe('light');
    expect(resolveTheme('system')).toBe('light');
  });

  it('prefers Electron nativeTheme over matchMedia', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
      electronAPI: { colorScheme: 'dark' },
    });
    expect(getSystemColorScheme()).toBe('dark');
  });

  it('subscribes to matchMedia and electron color scheme changes', () => {
    const removeMq = vi.fn();
    const removeElectron = vi.fn();
    const addListener = vi.fn();
    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => ({
        matches: false,
        addEventListener: addListener,
        removeEventListener: removeMq,
      })),
      electronAPI: {
        onColorSchemeChanged: vi.fn(() => removeElectron),
      },
    });

    const onChange = vi.fn();
    const cleanup = subscribeSystemColorScheme(onChange);
    expect(addListener).toHaveBeenCalled();
    cleanup();
    expect(removeMq).toHaveBeenCalled();
    expect(removeElectron).toHaveBeenCalled();
  });
});
