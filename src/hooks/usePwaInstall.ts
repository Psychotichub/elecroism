import { useCallback, useEffect, useState } from 'react';
import type { BeforeInstallPromptEvent } from '../types/pwa';
import {
  dismissPwaInstallBanner,
  isElectronApp,
  isPwaInstallDismissed,
  isWebStandalone,
} from '../utils/pwaEnvironment';
import { isTabletLike, requestTabletFullscreen } from '../utils/tabletDisplay';

export function usePwaInstall() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isWebStandalone());
  const [dismissed, setDismissed] = useState(isPwaInstallDismissed());
  const [tablet, setTablet] = useState(isTabletLike());

  useEffect(() => {
    if (isElectronApp()) return;

    const onResize = () => setTablet(isTabletLike());
    window.addEventListener('resize', onResize);

    const onBeforeInstall = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setInstallEvent(event);
    };

    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
      if (isTabletLike()) {
        void requestTabletFullscreen();
      }
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) return false;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallEvent(null);
      if (tablet) {
        await requestTabletFullscreen();
      }
      return true;
    }
    return false;
  }, [installEvent, tablet]);

  const dismiss = useCallback(() => {
    dismissPwaInstallBanner();
    setDismissed(true);
    setInstallEvent(null);
  }, []);

  const enterFullscreen = useCallback(async () => {
    return requestTabletFullscreen();
  }, []);

  const showInstallBanner =
    !isElectronApp() &&
    !installed &&
    !dismissed &&
    (installEvent != null || (tablet && !isWebStandalone()));

  return {
    showInstallBanner,
    canInstall: installEvent != null,
    tablet,
    installed,
    install,
    dismiss,
    enterFullscreen,
  };
}
