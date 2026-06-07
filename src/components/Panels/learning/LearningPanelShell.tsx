import React from 'react';
import { FiMapPin, FiMaximize2, FiMinimize2, FiX } from 'react-icons/fi';
import Card from '../../ui/Card';
import IconButton from '../../ui/IconButton';
import { cn } from '../../ui/cn';

type Props = {
  ariaLabel: string;
  eyebrow: string;
  title: string;
  meta?: React.ReactNode;
  docked?: boolean;
  pinned?: boolean;
  minimized?: boolean;
  onTogglePin?: () => void;
  onMinimize?: () => void;
  onRestore?: () => void;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

const LearningPanelShell: React.FC<Props> = ({
  ariaLabel,
  eyebrow,
  title,
  meta,
  docked = false,
  pinned = true,
  minimized = false,
  onTogglePin,
  onMinimize,
  onRestore,
  onClose,
  children,
  className,
}) => (
  <Card
    as="aside"
    variant="learning"
    aria-label={ariaLabel}
    className={cn(
      docked ? 'es-learning-panel-dock' : 'es-learning-panel-floating',
      className
    )}
  >
    <div className={cn('es-learning-panel-header', minimized && 'border-b-0')}>
      <div className="min-w-0 flex-1">
        <p className="es-typo-caption uppercase tracking-wide text-es-secondary">
          {eyebrow}
        </p>
        <h2 className="truncate es-typo-title-sm text-es-bright">{title}</h2>
        {meta && !minimized ? <div className="mt-1">{meta}</div> : null}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {!minimized && onTogglePin ? (
          <IconButton
            label={pinned ? 'Unpin learning panel' : 'Pin below inspector'}
            active={pinned}
            onClick={onTogglePin}
          >
            <FiMapPin aria-hidden />
          </IconButton>
        ) : null}
        {minimized ? (
          <IconButton label="Restore learning panel" onClick={onRestore}>
            <FiMaximize2 aria-hidden />
          </IconButton>
        ) : onMinimize ? (
          <IconButton label="Minimize learning panel" onClick={onMinimize}>
            <FiMinimize2 aria-hidden />
          </IconButton>
        ) : null}
        <IconButton label="Close learning panel" onClick={onClose}>
          <FiX aria-hidden />
        </IconButton>
      </div>
    </div>
    {minimized ? (
      <div className="es-learning-panel-minimized">
        <p className="truncate es-typo-body-sm text-es-secondary">{title}</p>
        <button
          type="button"
          onClick={onRestore}
          className="shrink-0 es-typo-caption text-es-learning es-focus-ring"
        >
          Expand
        </button>
      </div>
    ) : (
      <div className="es-learning-panel-body">{children}</div>
    )}
  </Card>
);

export default LearningPanelShell;
