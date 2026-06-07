/**
 * "Examples" dropdown button for the toolbar.
 *
 * Renders a dropdown with built-in example circuits grouped by category.
 * Clicking an item calls `loadCircuit()` with the pre-built Circuit object.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppIcon } from '../ui';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { EXAMPLE_CIRCUITS } from '../../examples/exampleCircuits';

const ExamplesDropdown: React.FC<{ inactiveClassName: string }> = ({
  inactiveClassName,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const loadCircuit = useCircuitStore((s) => s.loadCircuit);
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleLoad = useCallback(
    (buildFn: () => ReturnType<(typeof EXAMPLE_CIRCUITS)[0]['build']>) => {
      const circuit = buildFn();
      loadCircuit(circuit);
      setOpen(false);
    },
    [loadCircuit]
  );

  // Group by category
  const grouped = EXAMPLE_CIRCUITS.reduce(
    (acc, entry) => {
      (acc[entry.category] ??= []).push(entry);
      return acc;
    },
    {} as Record<string, typeof EXAMPLE_CIRCUITS>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition-colors ${
          open ? 'bg-blue-600 text-white' : inactiveClassName
        }`}
        title="Load an example circuit"
      >
        <span className="es-icon-toolbar">
          <AppIcon id="examples" />
        </span>
        <span className="hidden lg:inline">Examples</span>
        <span className="es-icon-inline opacity-70">
          <AppIcon id="chevron-down" size="inline" />
        </span>
      </button>

      {open && (
        <div
          className={`absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border shadow-xl ${tc.panel} ${tc.border}`}
          style={{ maxHeight: 420, overflowY: 'auto' }}
        >
          {Object.entries(grouped).map(([category, entries]) => (
            <div key={category}>
              <div
                className={`sticky top-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${tc.textMuted} ${
                  theme === 'dark' ? 'bg-zinc-800/95' : 'bg-zinc-100/95'
                }`}
              >
                {category}
              </div>
              {entries.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  onClick={() => handleLoad(entry.build)}
                  className={`w-full text-left px-3 py-2 transition-colors ${
                    theme === 'dark'
                      ? 'hover:bg-white/5'
                      : 'hover:bg-black/[0.04]'
                  }`}
                >
                  <span
                    className={`block text-xs font-medium ${tc.textBright}`}
                  >
                    {entry.name}
                  </span>
                  <span
                    className={`block text-[10px] leading-snug mt-0.5 ${tc.textMuted}`}
                  >
                    {entry.description}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExamplesDropdown;
