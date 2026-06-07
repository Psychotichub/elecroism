import React from 'react';
import { FiDownload, FiMaximize, FiX } from 'react-icons/fi';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { usePwaInstall } from '../../hooks/usePwaInstall';

const WebInstallBanner: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
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
      className={`flex shrink-0 items-center justify-between gap-3 border-b px-3 py-2 text-xs ${tc.toolbar} ${tc.border}`}
      role="region"
      aria-label="Install ElectroSim"
    >
      <p className={`min-w-0 leading-snug ${tc.textMuted}`}>
        {canInstall
          ? 'Install ElectroSim for offline access and a full-screen tablet workspace.'
          : 'Use full screen on your tablet for more canvas space, or install from the browser menu when available.'}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        {canInstall ? (
          <button
            type="button"
            onClick={() => void install()}
            className="flex items-center gap-1 rounded bg-indigo-700 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-indigo-600"
          >
            <FiDownload size={14} />
            Install app
          </button>
        ) : null}
        {tablet ? (
          <button
            type="button"
            onClick={() => void enterFullscreen()}
            className={`flex items-center gap-1 rounded border px-2.5 py-1 text-[11px] ${tc.border} ${tc.text}`}
          >
            <FiMaximize size={14} />
            Full screen
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          className={`rounded p-1 ${tc.textMuted}`}
          aria-label="Dismiss install prompt"
        >
          <FiX size={16} />
        </button>
      </div>
    </div>
  );
};

export default WebInstallBanner;
