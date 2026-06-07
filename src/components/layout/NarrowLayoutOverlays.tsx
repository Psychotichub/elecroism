import React, { Suspense } from 'react';
import { FiX } from 'react-icons/fi';
import IconButton from '../ui/IconButton';
import { themeColors, useThemeStore } from '../../store/themeStore';

type OverlayBackdropProps = {
  label: string;
  onClose: () => void;
};

const OverlayBackdrop: React.FC<OverlayBackdropProps> = ({ label, onClose }) => (
  <button
    type="button"
    className="absolute inset-0 z-40 bg-black/50"
    aria-label={label}
    onClick={onClose}
  />
);

type NarrowPaletteOverlayProps = {
  onClose: () => void;
  children: React.ReactNode;
};

export const NarrowPaletteOverlay: React.FC<NarrowPaletteOverlayProps> = ({
  onClose,
  children,
}) => (
  <>
    <OverlayBackdrop label="Close component palette" onClose={onClose} />
    <div
      className="es-sidebar-shell es-narrow-palette-overlay absolute inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] min-h-0 flex-col overflow-hidden border-r border-es-borderSubtle bg-es-chrome2 shadow-[var(--es-shadow-panel)]"
      role="dialog"
      aria-modal="true"
      aria-label="Component palette"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-es-borderSubtle px-2 py-1">
        <span className="es-typo-label text-es-secondary">Components</span>
        <IconButton label="Close component palette" size="md" onClick={onClose}>
          <FiX />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  </>
);

type NarrowInspectorOverlayProps = {
  onClose: () => void;
  inspector: React.ReactNode;
  learningDock: React.ReactNode;
};

export const NarrowInspectorOverlay: React.FC<NarrowInspectorOverlayProps> = ({
  onClose,
  inspector,
  learningDock,
}) => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];

  return (
    <>
      <OverlayBackdrop label="Close inspector" onClose={onClose} />
      <div
        className="es-inspector-overlay es-inspector-shell absolute inset-0 z-50 flex min-h-0 flex-col overflow-hidden border-l border-es-borderSubtle bg-es-chrome2 shadow-[var(--es-shadow-panel)]"
        role="dialog"
        aria-modal="true"
        aria-label="Inspector"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-es-borderSubtle px-2 py-1">
          <span className="es-typo-label text-es-secondary">Inspector</span>
          <IconButton label="Close inspector" size="md" onClick={onClose}>
            <FiX />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <Suspense
            fallback={
              <div
                className={`h-full min-h-0 w-full animate-pulse ${tc.panel}`}
                aria-hidden
              />
            }
          >
            {inspector}
          </Suspense>
        </div>
        {learningDock}
      </div>
    </>
  );
};
