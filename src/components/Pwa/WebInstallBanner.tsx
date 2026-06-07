import React from 'react';
import { FiDownload, FiMaximize, FiX } from 'react-icons/fi';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';

const WebInstallBanner: React.FC = () => {
  const {
    showInstallBanner,
    canInstall,
    tablet,
    install,
    dismiss,
    enterFullscreen,
  } = usePwaInstall();

  if (!showInstallBanner) return null;

  return (
    <div
      className="es-pwa-install-banner flex shrink-0 items-center justify-between gap-3 border-b border-es-borderSubtle bg-es-chrome1 px-3 py-2 es-typo-body-sm text-es-secondary"
      role="region"
      aria-label="Install ElectroSim"
    >
      <p className="min-w-0 leading-snug text-es-secondary">
        {canInstall
          ? 'Install ElectroSim for offline access and a full-screen tablet workspace.'
          : 'Use full screen on your tablet for more canvas space, or install from the browser menu when available.'}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        {canInstall ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => void install()}
          >
            <FiDownload size={14} aria-hidden />
            Install app
          </Button>
        ) : null}
        {tablet ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void enterFullscreen()}
          >
            <FiMaximize size={14} aria-hidden />
            Full screen
          </Button>
        ) : null}
        <IconButton
          label="Dismiss install prompt"
          size="md"
          tooltip={false}
          onClick={dismiss}
        >
          <FiX />
        </IconButton>
      </div>
    </div>
  );
};

export default WebInstallBanner;
