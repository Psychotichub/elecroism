import React from 'react';
import { MOTION_CLASS } from '../../design/motion';
import { cn } from './cn';
import AppIcon from './AppIcon';
import IconButton from './IconButton';

type Props = {
  open: boolean;
  title: string;
  titleId?: string;
  /** Used when `showHeader` is false. */
  ariaLabel?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
  className?: string;
  bodyClassName?: string;
  overlayClassName?: string;
  align?: 'center' | 'top';
  showHeader?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  footerClassName?: string;
};

const maxWidthClass = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

const Dialog: React.FC<Props> = ({
  open,
  title,
  titleId = 'es-dialog-title',
  ariaLabel,
  onClose,
  children,
  footer,
  maxWidth = 'md',
  className,
  bodyClassName,
  overlayClassName,
  align = 'center',
  showHeader = true,
  onKeyDown,
  footerClassName,
}) => {
  if (!open) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex bg-black/50 p-4',
        align === 'top' ? 'items-start pt-[12vh]' : 'items-center justify-center',
        MOTION_CLASS.dialogBackdrop,
        overlayClassName
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={showHeader ? titleId : undefined}
      aria-label={showHeader ? undefined : ariaLabel ?? title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={onKeyDown}
    >
      <div
        className={cn(
          'flex max-h-[85vh] w-full flex-col rounded-es-lg border border-es-borderSubtle bg-es-raised text-es-primary shadow-[var(--es-shadow-panel)]',
          MOTION_CLASS.dialogPanel,
          maxWidthClass[maxWidth],
          className
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {showHeader ? (
          <div className="flex items-center justify-between gap-2 border-b border-es-borderSubtle px-4 py-3">
            <h2 id={titleId} className="es-typo-title-sm text-es-bright">
              {title}
            </h2>
            <IconButton label="Close dialog" onClick={onClose}>
              <AppIcon id="close" />
            </IconButton>
          </div>
        ) : null}
        <div
          className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-4', bodyClassName)}
        >
          {children}
        </div>
        {footer ? (
          <div
            className={cn(
              'flex gap-2 border-t border-es-borderSubtle px-4 py-3',
              footerClassName ?? 'justify-end'
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Dialog;
