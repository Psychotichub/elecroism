import React, { useCallback, useRef, useState } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { useUiStore } from '../../store/uiStore';
import {
  DRAWING_QUICK_ACTIONS,
  searchDrawing,
  type DrawingSearchResult,
} from '../../utils/drawingSearch';

type PalettePanelProps = {
  onClose: () => void;
};

const PalettePanel: React.FC<PalettePanelProps> = ({ onClose }) => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
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
  const inputRef = useRef<HTMLInputElement>(null);

  const items: DrawingSearchResult[] = query.trim()
    ? searchDrawing(circuit, query, 14)
    : DRAWING_QUICK_ACTIONS.map((a) => ({
        id: `action-${a.id}`,
        kind: 'action' as const,
        title: a.title,
        subtitle: a.subtitle,
        score: 100,
        componentIds: [],
      }));

  const safeIndex = Math.min(
    activeIndex,
    Math.max(0, items.length - 1)
  );

  const runAction = useCallback(
    (item: DrawingSearchResult) => {
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

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 pt-[12vh] px-4"
      onMouseDown={onClose}
    >
      <div
        className={`w-full max-w-lg rounded-lg border shadow-2xl ${tc.border} ${tc.panel}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
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
          className={`w-full border-b bg-transparent px-3 py-2.5 text-sm outline-none ${tc.border} ${tc.text}`}
          aria-label="Command palette search"
        />
        <ul className="max-h-72 overflow-y-auto py-1" role="listbox">
          {items.length === 0 ? (
            <li className={`px-3 py-2 text-xs ${tc.textMuted}`}>No matches</li>
          ) : (
            items.map((item, idx) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={idx === safeIndex}
                  className={`flex w-full flex-col px-3 py-2 text-left text-xs ${
                    idx === safeIndex
                      ? 'bg-blue-600 text-white'
                      : `${tc.itemHover} ${tc.text}`
                  }`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => runAction(item)}
                >
                  <span className="font-medium">{item.title}</span>
                  <span
                    className={
                      idx === safeIndex ? 'text-blue-100' : tc.textMuted
                    }
                  >
                    {item.subtitle}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div
          className={`border-t px-3 py-1.5 text-[10px] ${tc.border} ${tc.textMuted}`}
        >
          ↑↓ navigate · Enter select · Esc close · Ctrl+K
        </div>
      </div>
    </div>
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
