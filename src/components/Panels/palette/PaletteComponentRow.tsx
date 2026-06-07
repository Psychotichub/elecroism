import React from 'react';
import { FiStar } from 'react-icons/fi';
import type { PaletteComponentItem } from './paletteGroups';
import PaletteSymbolThumbnail from './PaletteSymbolThumbnail';
import { highlightSearchMatch } from './paletteSearchHighlight';
import {
  formatComponentPanelHelpText,
  getComponentPanelDescription,
} from '../../../utils/componentPanelInfo';
import Tooltip from '../../ui/Tooltip';
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

  const favoriteLabel = isFavorite ? 'Remove from favorites' : 'Add to favorites';

  return (
    <Tooltip content={title} side="right" className="es-tooltip-multiline">
      <div
        id={optionId}
        role="option"
        aria-selected={isFocused}
        tabIndex={-1}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onFocus={onFocus}
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
        <Tooltip content={favoriteLabel} side="right">
          <button
            type="button"
            aria-label={favoriteLabel}
            className="es-palette-fav-btn es-focus-ring"
            onMouseEnter={(e) => e.stopPropagation()}
            onMouseLeave={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            onBlur={(e) => e.stopPropagation()}
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
        </Tooltip>
      </div>
    </Tooltip>
  );
};

export default PaletteComponentRow;
