import { useEffect } from 'react';
import { subscribeSystemColorScheme } from '../design/systemTheme';
import { useThemeStore } from '../store/themeStore';

/** Keeps resolved theme in sync when preference is `system`. */
export function useSystemThemeSync(): void {
  const preference = useThemeStore((s) => s.preference);
  const syncSystemTheme = useThemeStore((s) => s.syncSystemTheme);

  useEffect(() => {
    if (preference !== 'system') return;
    syncSystemTheme();
    return subscribeSystemColorScheme(() => {
      syncSystemTheme();
    });
  }, [preference, syncSystemTheme]);
}
