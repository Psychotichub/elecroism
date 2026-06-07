import type { Theme } from '../store/themeStore';

export type SystemColorScheme = 'light' | 'dark';

/** Resolved OS / browser colour scheme (never high-contrast). */
export function getSystemColorScheme(): SystemColorScheme {
  if (typeof window === 'undefined') return 'dark';
  const electron = window.electronAPI?.colorScheme;
  if (electron === 'light' || electron === 'dark') return electron;
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

export function systemSchemeToTheme(scheme: SystemColorScheme): Theme {
  return scheme === 'light' ? 'light' : 'dark';
}

export function subscribeSystemColorScheme(
  onChange: (scheme: SystemColorScheme) => void
): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const notify = () => onChange(getSystemColorScheme());

  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const onMq = () => notify();
  mq.addEventListener('change', onMq);

  const unsubElectron = window.electronAPI?.onColorSchemeChanged?.((scheme) => {
    onChange(scheme);
  });

  return () => {
    mq.removeEventListener('change', onMq);
    unsubElectron?.();
  };
}
