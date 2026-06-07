import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from '../../types';
import { useUiStore } from '../../store/uiStore';
import {
  clearDragComponentType,
  setDragComponentType,
} from '../../utils/dragState';
import {
  loadFavoriteTypes,
  toggleFavoriteType,
} from '../../utils/sidebarPaletteStorage';
import { FiChevronsDown, FiChevronsUp, FiSearch } from 'react-icons/fi';
import Chip from '../ui/Chip';
import Input from '../ui/Input';
import AppIcon from '../ui/AppIcon';
import { cn } from '../ui/cn';
import { MOTION_CLASS } from '../../design/motion';
import {
  ALL_PALETTE_TYPES,
  ITEM_BY_TYPE,
  PALETTE_GROUPS,
  TYPE_TO_GROUP,
  type PaletteComponentItem,
} from './palette/paletteGroups';
import PaletteSectionHeader from './palette/PaletteSectionHeader';
import PaletteComponentRow from './palette/PaletteComponentRow';
import {
  loadCollapsedGroups,
  loadComponentListOpen,
  loadSearchPanelOpen,
  saveCollapsedGroups,
  saveComponentListOpen,
  saveSearchPanelOpen,
} from './palette/palettePanelState';

type SidebarSection = {
  collapseKey: string;
  name: string;
  emoji: string;
  items: PaletteComponentItem[];
  isFavorites?: boolean;
};

const FAVORITES_KEY = 'Favorites';

const Sidebar: React.FC = () => {
  const setPendingInsertType = useUiStore((s) => s.setPendingInsertType);
  const paletteListRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [focusedPaletteIndex, setFocusedPaletteIndex] = useState(-1);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => loadCollapsedGroups());
  const [searchPanelOpen, setSearchPanelOpen] = useState(() => loadSearchPanelOpen());
  const [componentListOpen, setComponentListOpen] = useState(() =>
    loadComponentListOpen()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const paletteCategoryFilter = useUiStore((s) => s.paletteCategoryFilter);
  const setPaletteCategoryFilter = useUiStore((s) => s.setPaletteCategoryFilter);
  const activeCategoryFilter = paletteCategoryFilter ?? categoryFilter;

  const applyCategoryFilter = (name: string) => {
    setCategoryFilter(name);
    setPaletteCategoryFilter(null);
  };

  const [favorites, setFavorites] = useState<string[]>(() =>
    loadFavoriteTypes(ALL_PALETTE_TYPES)
  );

  useEffect(() => {
    saveCollapsedGroups(collapsed);
  }, [collapsed]);

  useEffect(() => {
    saveSearchPanelOpen(searchPanelOpen);
  }, [searchPanelOpen]);

  useEffect(() => {
    saveComponentListOpen(componentListOpen);
  }, [componentListOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement
      ) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setSearchPanelOpen(true);
      requestAnimationFrame(() => searchInputRef.current?.focus());
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  const filteredSections: SidebarSection[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matches = (item: PaletteComponentItem) => {
      if (!q) return true;
      const blob = `${item.label} ${item.detail ?? ''} ${item.type}`.toLowerCase();
      return blob.includes(q);
    };
    const catOk = (item: PaletteComponentItem) =>
      activeCategoryFilter === 'all' ||
      TYPE_TO_GROUP.get(item.type) === activeCategoryFilter;

    const out: SidebarSection[] = [];

    const favItems = favorites
      .map((t) => ITEM_BY_TYPE.get(t as ComponentType))
      .filter((x): x is PaletteComponentItem => !!x)
      .filter(matches)
      .filter(catOk);
    if (favItems.length > 0) {
      out.push({
        collapseKey: FAVORITES_KEY,
        name: FAVORITES_KEY,
        emoji: '⭐',
        items: favItems,
        isFavorites: true,
      });
    }

    for (const g of PALETTE_GROUPS) {
      if (activeCategoryFilter !== 'all' && g.name !== activeCategoryFilter) {
        continue;
      }
      const items = g.items.filter(matches).filter(catOk);
      if (items.length === 0) continue;
      out.push({
        collapseKey: g.name,
        name: g.name,
        emoji: g.emoji,
        items,
      });
    }

    return out;
  }, [searchQuery, activeCategoryFilter, favorites]);

  const visiblePaletteItems = useMemo(() => {
    const out: { item: PaletteComponentItem; sectionKey: string; optionId: string }[] =
      [];
    for (const section of filteredSections) {
      if (collapsed.has(section.collapseKey)) continue;
      section.items.forEach((item, idx) => {
        out.push({
          item,
          sectionKey: section.collapseKey,
          optionId: `palette-opt-${section.collapseKey}-${item.type}-${idx}`,
        });
      });
    }
    return out;
  }, [filteredSections, collapsed]);

  const safeFocusedPaletteIndex =
    focusedPaletteIndex >= visiblePaletteItems.length
      ? visiblePaletteItems.length > 0
        ? visiblePaletteItems.length - 1
        : -1
      : focusedPaletteIndex;

  const handlePaletteKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const count = visiblePaletteItems.length;
    if (count === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedPaletteIndex((i) => (i < 0 ? 0 : Math.min(count - 1, i + 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedPaletteIndex((i) => (i < 0 ? count - 1 : Math.max(0, i - 1)));
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setFocusedPaletteIndex(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setFocusedPaletteIndex(count - 1);
      return;
    }
    if (e.key === 'Enter' && safeFocusedPaletteIndex >= 0) {
      e.preventDefault();
      const entry = visiblePaletteItems[safeFocusedPaletteIndex];
      if (entry) {
        setPendingInsertType(entry.item.type);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setFocusedPaletteIndex(-1);
      setPendingInsertType(null);
    }
  };

  const toggleGroup = (name: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const expandAllGroups = () => setCollapsed(new Set());

  const collapseAllGroups = () => {
    setCollapsed(new Set(filteredSections.map((s) => s.collapseKey)));
  };

  const handleDragStart = (e: React.DragEvent, item: PaletteComponentItem) => {
    setDragComponentType(item.type);
    e.dataTransfer.setData('componentType', item.type);
    e.dataTransfer.setData('text/plain', item.type);
    if (item.type === 'push_button') {
      e.dataTransfer.setData('pushButtonVariant', 'NO');
    } else {
      e.dataTransfer.setData('pushButtonVariant', '');
    }
    if (item.type === 'mcb' && item.mcbInitialPoles === 2) {
      e.dataTransfer.setData('mcbInitialPoles', '2');
    } else {
      e.dataTransfer.setData('mcbInitialPoles', '');
    }
    e.dataTransfer.effectAllowed = 'copy';
  };

  let paletteRowCounter = 0;

  return (
    <div
      id="sidebar-palette-root"
      className="es-palette-root"
      data-testid="sidebar-palette"
    >
      <div className="es-palette-toolbar">
        <h2 id="sidebar-palette-heading" className="es-typo-label text-es-bright min-w-0 truncate">
          Components
        </h2>
        <div
          className="flex shrink-0 gap-0.5 rounded-es-sm border border-es-borderSubtle p-0.5"
          role="group"
          aria-label="Expand or collapse all component groups"
        >
          <button
            type="button"
            title="Expand all groups"
            disabled={!componentListOpen || filteredSections.length === 0}
            onClick={expandAllGroups}
            className="es-palette-toolbar-btn es-focus-ring disabled:opacity-30 disabled:pointer-events-none"
          >
            <FiChevronsDown className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            title="Collapse all groups"
            disabled={!componentListOpen || filteredSections.length === 0}
            onClick={collapseAllGroups}
            className="es-palette-toolbar-btn es-focus-ring disabled:opacity-30 disabled:pointer-events-none"
          >
            <FiChevronsUp className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="border-t border-es-borderSubtle">
        <button
          type="button"
          onClick={() => setSearchPanelOpen((o) => !o)}
          aria-expanded={searchPanelOpen}
          aria-controls={searchPanelOpen ? 'sidebar-search-panel' : undefined}
          title={
            searchPanelOpen
              ? 'Hide search and category filters'
              : 'Show search and category filters'
          }
          className="es-palette-panel-toggle es-focus-ring"
        >
          <span
            className={cn(
              'es-icon-inline text-es-secondary',
              MOTION_CLASS.transitionAll,
              searchPanelOpen && 'rotate-90'
            )}
            aria-hidden
          >
            <AppIcon id="chevron-right" size="inline" />
          </span>
          <span id="sidebar-search-panel-heading" className="es-typo-label text-es-secondary">
            Search & filters
          </span>
        </button>
        {searchPanelOpen && (
          <div
            id="sidebar-search-panel"
            role="region"
            aria-labelledby="sidebar-search-panel-heading"
            className="es-palette-search-panel"
            data-testid="palette-search-panel"
          >
            <label className="sr-only" htmlFor="sidebar-component-search">
              Search components
            </label>
            <div className="relative">
              <FiSearch
                className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-es-secondary"
                aria-hidden
              />
              <Input
                ref={searchInputRef}
                id="sidebar-component-search"
                type="search"
                autoComplete="off"
                placeholder="Search… (/)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="py-1 pl-7 es-typo-body-sm"
              />
            </div>
            <div
              className="flex flex-wrap gap-1"
              role="group"
              aria-label="Category filters"
              data-testid="palette-category-chips"
            >
              <Chip
                active={activeCategoryFilter === 'all'}
                onClick={() => applyCategoryFilter('all')}
              >
                All
              </Chip>
              {PALETTE_GROUPS.map((g) => (
                <Chip
                  key={g.name}
                  active={activeCategoryFilter === g.name}
                  onClick={() => applyCategoryFilter(g.name)}
                >
                  {g.emoji} {g.name}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-es-borderSubtle">
        <button
          type="button"
          onClick={() => setComponentListOpen((o) => !o)}
          aria-expanded={componentListOpen}
          aria-controls={componentListOpen ? 'sidebar-palette-body' : undefined}
          title={componentListOpen ? 'Hide component list' : 'Show component list'}
          className="es-palette-panel-toggle es-focus-ring"
        >
          <span
            className={cn(
              'es-icon-inline text-es-secondary',
              MOTION_CLASS.transitionAll,
              componentListOpen && 'rotate-90'
            )}
            aria-hidden
          >
            <AppIcon id="chevron-right" size="inline" />
          </span>
          <span id="sidebar-component-list-heading" className="es-typo-label text-es-secondary">
            Component list
          </span>
        </button>
      </div>

      {componentListOpen && (
        <div
          ref={paletteListRef}
          id="sidebar-palette-body"
          role="listbox"
          aria-label="Component palette"
          aria-labelledby="sidebar-component-list-heading"
          aria-activedescendant={
            focusedPaletteIndex >= 0
              ? visiblePaletteItems[focusedPaletteIndex]?.optionId
              : undefined
          }
          tabIndex={0}
          onKeyDown={handlePaletteKeyDown}
          onFocus={() => {
            if (focusedPaletteIndex < 0 && visiblePaletteItems.length > 0) {
              setFocusedPaletteIndex(0);
            }
          }}
          className="es-palette-list es-focus-ring"
          data-testid="palette-component-list"
        >
          {filteredSections.length === 0 ? (
            <p className="px-3 py-4 text-center es-typo-caption text-es-secondary">
              No components match this search or category.
            </p>
          ) : (
            filteredSections.map((section) => {
              const isCollapsed = collapsed.has(section.collapseKey);
              const sectionDomId = `sidebar-group-${section.collapseKey}`;
              return (
                <div
                  key={section.collapseKey}
                  data-testid={`palette-section-${section.collapseKey}`}
                  className={cn(
                    'es-palette-section',
                    section.isFavorites && 'es-palette-favorites-section'
                  )}
                >
                  <PaletteSectionHeader
                    name={section.name}
                    emoji={section.emoji}
                    count={section.items.length}
                    expanded={!isCollapsed}
                    onToggle={() => toggleGroup(section.collapseKey)}
                    sectionId={sectionDomId}
                    isFavorites={section.isFavorites}
                  />
                  {!isCollapsed && (
                    <div id={sectionDomId} className="es-palette-section-body">
                      {section.items.map((item, idx) => {
                        const entry = visiblePaletteItems[paletteRowCounter];
                        const optionId =
                          entry?.optionId ??
                          `palette-opt-${section.collapseKey}-${item.type}-${idx}`;
                        const isFocused =
                          paletteRowCounter === safeFocusedPaletteIndex;
                        paletteRowCounter += 1;
                        return (
                          <PaletteComponentRow
                            key={`${section.collapseKey}-${item.type}-${idx}`}
                            item={item}
                            sectionKey={section.collapseKey}
                            optionId={optionId}
                            isFocused={isFocused}
                            isFavorite={favorites.includes(item.type)}
                            searchQuery={searchQuery}
                            onToggleFavorite={() =>
                              setFavorites((cur) =>
                                toggleFavoriteType(item.type, cur, ALL_PALETTE_TYPES)
                              )
                            }
                            onDragStart={(e) => handleDragStart(e, item)}
                            onDragEnd={clearDragComponentType}
                            onFocus={() => {
                              const flatIdx = visiblePaletteItems.findIndex(
                                (v) => v.optionId === optionId
                              );
                              if (flatIdx >= 0) setFocusedPaletteIndex(flatIdx);
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
