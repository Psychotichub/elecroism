const INSTALL_DISMISS_KEY = 'electroism.pwa.installDismissed.v1';

/** True when running inside the packaged Electron renderer. */
export function isElectronApp(): boolean {
  return typeof window !== 'undefined' && window.electronAPI != null;
}

/** True when the web app is installed (standalone / iOS home screen). */
export function isWebStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return (
    iosStandalone ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
}

/** Whether the install banner was dismissed for this browser profile. */
export function isPwaInstallDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(INSTALL_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissPwaInstallBanner(): void {
  try {
    window.localStorage.setItem(INSTALL_DISMISS_KEY, '1');
  } catch {
    // ignore
  }
}

/** Register the offline shell service worker on web builds only. */
export async function registerWebServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;
  if (isElectronApp() || !('serviceWorker' in navigator)) return null;

  try {
    return await navigator.serviceWorker.register('./sw-shell.js', {
      scope: './',
    });
  } catch {
    return null;
  }
}
