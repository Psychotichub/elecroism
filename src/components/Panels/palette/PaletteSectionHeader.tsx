import React from 'react';
import AppIcon from '../../ui/AppIcon';
import Tooltip from '../../ui/Tooltip';
import { cn } from '../../ui/cn';
import { MOTION_CLASS } from '../../../design/motion';

type Props = {
  name: string;
  emoji: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  sectionId: string;
  isFavorites?: boolean;
};

const PaletteSectionHeader: React.FC<Props> = ({
  name,
  emoji,
  count,
  expanded,
  onToggle,
  sectionId,
  isFavorites = false,
}) => {
  const hint = expanded ? `Collapse ${name}` : `Expand ${name} (${count})`;

  return (
    <Tooltip content={hint} side="right">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={sectionId}
        className={cn(
          'es-palette-section-header es-focus-ring',
          isFavorites && 'es-palette-favorites-header'
        )}
      >
        <span
          className={cn(
            'es-icon-inline text-es-secondary',
            MOTION_CLASS.transitionAll,
            expanded && 'rotate-90'
          )}
          aria-hidden
        >
          <AppIcon id="chevron-right" size="inline" />
        </span>
        <span className="min-w-0 truncate es-typo-label text-es-primary">
          <span className="mr-1" aria-hidden>
            {emoji}
          </span>
          {name}
        </span>
        <span className="ml-auto shrink-0 es-typo-caption es-tabular-nums text-es-secondary">
          {count}
        </span>
      </button>
    </Tooltip>
  );
};

export default PaletteSectionHeader;
