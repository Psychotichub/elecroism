import React, { useEffect, useId, useRef, useState } from 'react';
import type { ComponentPanelDescription } from '../../../utils/componentPanelInfo';

type Props = {
  info: ComponentPanelDescription;
  className?: string;
};

const ComponentHelpPopover: React.FC<Props> = ({ info, className }) => {
  const popoverId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative inline-flex ${className ?? ''}`}>
      <button
        type="button"
        aria-label={`About ${info.displayName}`}
        aria-expanded={open}
        aria-controls={popoverId}
        data-testid="component-help-trigger"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-es-borderSubtle bg-es-chrome2 text-[10px] font-bold leading-none text-es-secondary es-focus-ring hover:bg-es-hover hover:text-es-primary"
      >
        ?
      </button>
      {open ? (
        <div
          id={popoverId}
          role="tooltip"
          data-testid="component-help-popover"
          className="absolute left-0 top-full z-50 mt-1 w-56 rounded-es-lg border border-es-borderSubtle bg-es-chrome2 p-2.5 shadow-[var(--es-shadow-panel)]"
        >
          <p className="es-typo-body-sm font-semibold text-es-bright">
            {info.displayName}
          </p>
          <p className="mt-1 es-typo-body-sm leading-snug text-es-primary">
            {info.description}
          </p>
          <ul className="mt-2 list-inside list-disc space-y-0.5 es-typo-caption text-es-secondary">
            {info.features.slice(0, 4).map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p className="mt-2 es-typo-caption leading-snug text-es-secondary">
            {info.purpose}
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default ComponentHelpPopover;
