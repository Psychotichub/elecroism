import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useUiStore } from '../../store/uiStore';
import type { DrawingSearchResult } from '../../utils/drawingSearch';
import {
  buildPaletteSections,
  flattenPaletteSections,
} from '../../utils/commandPaletteSections';
import {
  loadRecentPaletteIds,
  recordPaletteSelection,
} from '../../utils/commandPaletteRecent';
import Dialog from '../ui/Dialog';
import Input from '../ui/Input';
import PaletteResultRow from './commandPalette/PaletteResultRow';

type PalettePanelProps = {
  onClose: () => void;
};

const PalettePanel: React.FC<PalettePanelProps> = ({ onClose }) => {
  const circuit = useCircuitStore((s) => s.circuit);
  const focusComponents = useCircuitStore((s) => s.focusComponents);
  const setSelected = useCircuitStore((s) => s.setSelected);
  const selectUnwiredComponents = useCircuitStore(
    (s) => s.selectUnwiredComponents
  );
  const selectFaultedComponents = useCircuitStore(
    (s) => s.selectFaultedComponents
  );
  const selectAllOfType = useCircuitStore((s) => s.selectAllOfType);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentIds] = useState(() => loadRecentPaletteIds());
  const inputRef = useRef<HTMLInputElement>(null);

  const sections = useMemo(
    () => buildPaletteSections(circuit, query, recentIds),
    [circuit, query, recentIds]
  );

  const items = useMemo(() => flattenPaletteSections(sections), [sections]);

  const safeIndex = Math.min(activeIndex, Math.max(0, items.length - 1));

  const runAction = useCallback(
    (item: DrawingSearchResult) => {
      recordPaletteSelection(item.id);
      onClose();
      if (item.kind === 'component') {
        focusComponents(item.componentIds);
        return;
      }
      if (item.kind === 'wire' && item.wireId) {
        setSelected(item.wireId);
        return;
      }
      if (item.kind === 'action') {
        switch (item.id) {
          case 'action-select-unwired':
            selectUnwiredComponents();
            break;
          case 'action-select-faulted':
            selectFaultedComponents();
            break;
          case 'action-selectall-mcb':
            selectAllOfType('mcb');
            break;
          case 'action-selectall-motor':
            selectAllOfType('motor');
            break;
          case 'action-selectall-contactor':
            selectAllOfType('contactor');
            break;
          default:
            break;
        }
      }
    },
    [
      focusComponents,
      onClose,
      selectAllOfType,
      selectFaultedComponents,
      selectUnwiredComponents,
      setSelected,
    ]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(items.length - 1, i + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === 'Enter' && items[safeIndex]) {
      e.preventDefault();
      runAction(items[safeIndex]);
    }
  };

  let rowIndex = 0;

  return (
    <Dialog
      open
      title="Command palette"
      ariaLabel="Command palette"
      showHeader={false}
      align="top"
      maxWidth="lg"
      overlayClassName="z-[200]"
      bodyClassName="p-0"
      className="es-command-palette-panel"
      onClose={onClose}
      onKeyDown={onKeyDown}
      footerClassName="justify-start"
      footer={
        <p className="es-typo-caption text-es-secondary">
          ↑↓ navigate · Enter select · Esc close · Ctrl+K
        </p>
      }
    >
      <Input
        ref={inputRef}
        type="text"
        autoFocus
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
        }}
        onKeyDown={onKeyDown}
        placeholder="Find device, wire, or action…"
        aria-label="Command palette search"
        className="es-command-palette-input"
      />
      <div
        className="es-command-palette-list"
        role="listbox"
        aria-label="Command palette results"
        data-testid="command-palette-list"
      >
        {items.length === 0 ? (
          <p className="px-3 py-2 es-typo-body text-es-secondary">No matches</p>
        ) : (
          sections.map((section) => (
            <section key={section.id} data-testid={`palette-section-${section.id}`}>
              <h3 className="es-command-palette-section-heading">
                {section.label}
              </h3>
              <ul className="py-0.5">
                {section.items.map((item) => {
                  const idx = rowIndex;
                  rowIndex += 1;
                  return (
                    <li key={item.id}>
                      <PaletteResultRow
                        item={item}
                        selected={idx === safeIndex}
                        onHover={() => setActiveIndex(idx)}
                        onSelect={() => runAction(item)}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </Dialog>
  );
};

const CommandPalette: React.FC = () => {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const session = useUiStore((s) => s.commandPaletteSession);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);

  if (!open) return null;

  return <PalettePanel key={session} onClose={() => setOpen(false)} />;
};

export default CommandPalette;
