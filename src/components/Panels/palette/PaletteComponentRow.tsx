import React from 'react';
import { FiStar } from 'react-icons/fi';
import type { PaletteComponentItem } from './paletteGroups';
import PaletteSymbolThumbnail from './PaletteSymbolThumbnail';
import { highlightSearchMatch } from './paletteSearchHighlight';
import {
  formatComponentPanelHelpText,
  getComponentPanelDescription,
} from '../../../utils/componentPanelInfo';
import { cn } from '../../ui/cn';

type Props = {
  item: PaletteComponentItem;
  sectionKey: string;
  optionId: string;
  isFocused: boolean;
  isFavorite: boolean;
  searchQuery: string;
  onToggleFavorite: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onFocus: () => void;
};

const PaletteComponentRow: React.FC<Props> = ({
  item,
  sectionKey,
  optionId,
  isFocused,
  isFavorite,
  searchQuery,
  onToggleFavorite,
  onDragStart,
  onDragEnd,
  onFocus,
}) => {
  const help = getComponentPanelDescription(item.type);
  const title = formatComponentPanelHelpText(
    help ?? {
      displayName: item.type,
      description: item.detail ?? '',
      features: [],
      purpose: '',
    }
  );

  return (
    <div
      id={optionId}
      role="option"
      aria-selected={isFocused}
      tabIndex={-1}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onFocus={onFocus}
      title={title}
      data-testid={`palette-row-${sectionKey}-${item.type}`}
      className={cn(
        'es-palette-row es-focus-ring',
        isFocused && 'es-palette-row-focused'
      )}
    >
      <PaletteSymbolThumbnail type={item.type} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate es-typo-body-sm text-es-primary">
        {highlightSearchMatch(item.label, searchQuery)}
      </span>
      <button
        type="button"
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        className="es-palette-fav-btn es-focus-ring"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite();
        }}
      >
        <FiStar
          className={cn(
            'h-3.5 w-3.5',
            isFavorite
              ? 'fill-amber-400 text-amber-400'
              : 'text-es-secondary opacity-40'
          )}
          strokeWidth={isFavorite ? 0 : 1.75}
        />
      </button>
    </div>
  );
};

export default PaletteComponentRow;
