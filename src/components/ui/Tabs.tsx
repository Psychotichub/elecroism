import React, { useEffect, useId, useRef, useState } from 'react';
import { cn } from './cn';
import Badge from './Badge';
import AppIcon from './AppIcon';

export type TabItem<T extends string> = {
  id: T;
  label: string;
  /** Replaces `label` when `compact` is true (e.g. selection summary). */
  compactLabel?: string;
  badge?: number;
  badgeVariant?: 'default' | 'warning' | 'error';
  /** Changes re-mount the badge to replay the bump animation. */
  badgeBumpKey?: number | string;
};

type Props<T extends string> = {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  className?: string;
  onTabKeyDown?: (e: React.KeyboardEvent, id: T) => void;
  /** Shorter tab captions when the tab strip is narrow. */
  compact?: boolean;
  overflowItems?: TabItem<T>[];
  overflowMenuLabel?: string;
};

function tabCaption<T extends string>(item: TabItem<T>, compact: boolean): string {
  if (compact && item.compactLabel) return item.compactLabel;
  return item.label;
}

function TabButton<T extends string>({
  item,
  selected,
  compact,
  onChange,
  onTabKeyDown,
}: {
  item: TabItem<T>;
  selected: boolean;
  compact: boolean;
  onChange: (id: T) => void;
  onTabKeyDown?: (e: React.KeyboardEvent, id: T) => void;
}) {
  const caption = tabCaption(item, compact);
  const aria =
    compact && item.compactLabel && item.compactLabel !== item.label
      ? `${item.label} — ${item.compactLabel}`
      : item.label;

  return (
    <button
      type="button"
      role="tab"
      id={`tab-${item.id}`}
      aria-selected={selected}
      aria-controls={`panel-${item.id}`}
      aria-label={aria}
      tabIndex={selected ? 0 : -1}
      onClick={() => onChange(item.id)}
      onKeyDown={(e) => onTabKeyDown?.(e, item.id)}
      className={cn(
        'relative shrink-0 px-2.5 py-2 es-typo-label es-focus-ring',
        selected
          ? 'border-b-2 border-es-accent text-es-bright'
          : 'border-b-2 border-transparent text-es-secondary hover:text-es-primary'
      )}
    >
      <span className="max-w-[8rem] truncate whitespace-nowrap">{caption}</span>
      {item.badge !== undefined && item.badge > 0 ? (
        <span className="absolute right-0.5 top-0.5">
          <Badge
            key={
              item.badgeBumpKey !== undefined
                ? `${item.id}-badge-${item.badgeBumpKey}`
                : item.id
            }
            variant={item.badgeVariant ?? 'warning'}
            bump={item.badgeBumpKey !== undefined}
          >
            {item.badge > 9 ? '9+' : item.badge}
          </Badge>
        </span>
      ) : null}
    </button>
  );
}

function TabOverflowMenu<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const activeItem = items.find((item) => item.id === value);
  const activeInOverflow = activeItem != null;

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
    <div ref={rootRef} className="relative shrink-0 border-l border-es-borderSubtle">
      <button
        type="button"
        id="tab-overflow-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        data-testid="tab-overflow-trigger"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-full items-center gap-1 px-2.5 py-2 es-typo-label es-focus-ring',
          activeInOverflow
            ? 'border-b-2 border-es-accent text-es-bright'
            : 'border-b-2 border-transparent text-es-secondary hover:text-es-primary'
        )}
      >
        <span className="whitespace-nowrap">
          {activeInOverflow ? activeItem.label : label}
        </span>
        <span className="es-icon-inline">
          <AppIcon id="chevron-down" size="inline" />
        </span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="es-menu-panel absolute right-0 top-full z-50 min-w-[9rem]"
        >
          {items.map((item) => {
            const selected = item.id === value;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={cn(
                  'es-menu-item w-full',
                  selected && 'es-menu-item-checked'
                )}
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
              >
                <span className="es-menu-item-leading">
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && item.badge > 0 ? (
                  <Badge variant={item.badgeVariant ?? 'warning'}>
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Tabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className,
  onTabKeyDown,
  compact = false,
  overflowItems,
  overflowMenuLabel = 'Analysis',
}: Props<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      data-testid="tabs-root"
      className={cn(
        'flex shrink-0 items-stretch border-b border-es-borderSubtle',
        className
      )}
    >
      <div className="flex min-w-0 flex-1 overflow-x-auto">
        {items.map((item) => (
          <TabButton
            key={item.id}
            item={item}
            selected={item.id === value}
            compact={compact}
            onChange={onChange}
            onTabKeyDown={onTabKeyDown}
          />
        ))}
      </div>
      {overflowItems && overflowItems.length > 0 ? (
        <TabOverflowMenu
          items={overflowItems}
          value={value}
          onChange={onChange}
          label={overflowMenuLabel}
        />
      ) : null}
    </div>
  );
}

export default Tabs;
