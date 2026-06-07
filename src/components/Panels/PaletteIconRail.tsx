import React from 'react';
import Tooltip from '../ui/Tooltip';
import { PALETTE_GROUP_META } from './paletteGroupMeta';
import { useUiStore } from '../../store/uiStore';

const PaletteIconRail: React.FC = () => {
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const setPaletteCategoryFilter = useUiStore((s) => s.setPaletteCategoryFilter);

  const openCategory = (name: string) => {
    setPaletteCategoryFilter(name);
    setSidebarCollapsed(false);
  };

  return (
    <nav
      className="es-palette-rail flex h-full w-full flex-col items-center gap-0.5 overflow-y-auto border-r border-es-borderSubtle bg-es-chrome2 py-1"
      aria-label="Component palette categories"
      data-testid="palette-icon-rail"
    >
      {PALETTE_GROUP_META.map((group) => (
        <Tooltip key={group.name} content={group.name} side="right">
          <button
            type="button"
            aria-label={group.name}
            onClick={() => openCategory(group.name)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-es-sm text-base es-focus-ring hover:bg-es-hover"
          >
            <span aria-hidden>{group.emoji}</span>
          </button>
        </Tooltip>
      ))}
    </nav>
  );
};

export default PaletteIconRail;
