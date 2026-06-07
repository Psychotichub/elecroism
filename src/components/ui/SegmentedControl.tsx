import React from 'react';
import { cn } from './cn';
import Tooltip from './Tooltip';

export type SegmentItem<T extends string> = {
  id: T;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string | null;
};

type Props<T extends string> = {
  items: SegmentItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  className?: string;
};

function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className,
}: Props<T>) {
  return (
    <div
      role="toolbar"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-es-md border border-es-borderSubtle bg-es-chrome2 p-0.5',
        className
      )}
    >
      {items.map((item) => {
        const active = item.id === value;
        const hint =
          item.shortcut ? `${item.label} (${item.shortcut})` : item.label;

        return (
          <Tooltip key={item.id} content={hint}>
            <button
              type="button"
              aria-pressed={active}
              aria-label={hint}
              onClick={() => onChange(item.id)}
              className={cn(
                'inline-flex items-center gap-1 rounded-es-sm px-2 py-1 text-xs font-medium es-focus-ring transition-colors duration-[var(--es-motion-fast)] motion-reduce:transition-none',
                active
                  ? 'bg-es-accent text-es-accentFg shadow-sm'
                  : 'text-es-primary hover:bg-es-hover'
              )}
            >
              {item.icon ? (
                <span className="es-icon-toolbar">{item.icon}</span>
              ) : null}
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
