import React from 'react';
import type { DrawingSearchResult } from '../../../utils/drawingSearch';
import { cn } from '../../ui/cn';

type Props = {
  item: DrawingSearchResult;
  selected: boolean;
  onSelect: () => void;
  onHover: () => void;
};

const PaletteResultRow: React.FC<Props> = ({
  item,
  selected,
  onSelect,
  onHover,
}) => (
  <button
    type="button"
    role="option"
    aria-selected={selected}
    data-testid={`palette-row-${item.id}`}
    className={cn(
      'es-command-palette-row es-focus-ring',
      selected && 'es-command-palette-row-selected'
    )}
    onMouseEnter={onHover}
    onClick={onSelect}
  >
    <span
      className={cn(
        'es-typo-body font-medium',
        selected ? 'text-es-accentFg' : 'text-es-primary'
      )}
    >
      {item.title}
    </span>
    <span
      className={cn(
        'es-typo-body-sm',
        selected ? 'text-es-accentFg/80' : 'text-es-secondary'
      )}
    >
      {item.subtitle}
    </span>
  </button>
);

export default PaletteResultRow;
