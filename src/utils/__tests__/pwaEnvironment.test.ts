/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dismissPwaInstallBanner,
  isElectronApp,
  isPwaInstallDismissed,
  isWebStandalone,
  registerWebServiceWorker,
} from '../pwaEnvironment';

describe('pwaEnvironment', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('electronAPI', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects Electron renderer', () => {
    vi.stubGlobal('electronAPI', { platform: 'win32' });
    expect(isElectronApp()).toBe(true);
  });

  it('tracks install banner dismissal', () => {
    expect(isPwaInstallDismissed()).toBe(false);
    dismissPwaInstallBanner();
    expect(isPwaInstallDismissed()).toBe(true);
  });

  it('detects standalone display mode', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('standalone'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    expect(isWebStandalone()).toBe(true);
  });

  it('skips service worker registration in Electron', async () => {
    vi.stubGlobal('electronAPI', { platform: 'darwin' });
    const register = vi.fn();
    vi.stubGlobal('navigator', { serviceWorker: { register } });
    const result = await registerWebServiceWorker();
    expect(result).toBeNull();
    expect(register).not.toHaveBeenCalled();
  });
});
