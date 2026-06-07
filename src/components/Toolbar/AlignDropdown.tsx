import React, { useMemo, useRef, useState } from 'react';
import {
  FiAlignCenter,
  FiAlignJustify,
  FiAlignLeft,
  FiAlignRight,
  FiChevronDown,
  FiMaximize2,
} from 'react-icons/fi';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import type { AlignMode, DistributeMode } from '../../utils/componentAlignment';

type AlignDropdownProps = {
  inactiveClassName: string;
};

const AlignDropdown: React.FC<AlignDropdownProps> = ({ inactiveClassName }) => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const circuit = useCircuitStore((s) => s.circuit);
  const selectedId = useCircuitStore((s) => s.selectedId);
  const alignSelection = useCircuitStore((s) => s.alignSelection);
  const distributeSelection = useCircuitStore((s) => s.distributeSelection);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedCount = useMemo(
    () =>
      circuit.components.filter((c) => c.selected || c.id === selectedId)
        .length,
    [circuit.components, selectedId]
  );

  const canAlign = selectedCount >= 2;
  const canDistribute = selectedCount >= 3;

  const runAlign = (mode: AlignMode) => {
    alignSelection(mode);
    setOpen(false);
  };

  const runDistribute = (mode: DistributeMode) => {
    distributeSelection(mode);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title={
          canAlign
            ? 'Align / distribute selection (2+ items)'
            : 'Select 2+ components to align'
        }
        disabled={!canAlign}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-0.5 rounded px-1.5 py-1 text-xs transition-colors disabled:opacity-40 ${
          open ? 'bg-blue-600 text-white' : inactiveClassName
        }`}
      >
        <FiAlignLeft size={14} />
        <span className="hidden lg:inline">Align</span>
        <FiChevronDown size={12} />
      </button>

      {open && canAlign ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close align menu"
            onClick={() => setOpen(false)}
          />
          <div
            className={`absolute left-0 top-full z-50 mt-1 min-w-[11rem] rounded border py-1 shadow-lg ${tc.border} ${tc.panel}`}
          >
            <div className={`px-2 py-1 text-[9px] font-semibold uppercase ${tc.textMuted}`}>
              Align ({selectedCount})
            </div>
            {(
              [
                ['left', 'Left', FiAlignLeft],
                ['right', 'Right', FiAlignRight],
                ['top', 'Top', FiMaximize2],
                ['bottom', 'Bottom', FiMaximize2],
                ['centerH', 'Center H', FiAlignCenter],
                ['centerV', 'Center V', FiAlignJustify],
              ] as const
            ).map(([mode, label, Icon]) => (
              <button
                key={mode}
                type="button"
                onClick={() => runAlign(mode)}
                className={`flex w-full items-center gap-2 px-2 py-1 text-left text-xs ${tc.itemHover} ${tc.text}`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
            <div className={`my-1 border-t ${tc.border}`} />
            <div className={`px-2 py-1 text-[9px] font-semibold uppercase ${tc.textMuted}`}>
              Distribute {canDistribute ? `(${selectedCount})` : '(need 3+)'}
            </div>
            {(
              [
                ['horizontal', 'Even H'],
                ['vertical', 'Even V'],
                ['spacingH', `Snap H (${circuit.gridSize})`],
                ['spacingV', `Snap V (${circuit.gridSize})`],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                disabled={!canDistribute}
                onClick={() => runDistribute(mode)}
                className={`flex w-full px-2 py-1 text-left text-xs disabled:opacity-40 ${tc.itemHover} ${tc.text}`}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default AlignDropdown;
