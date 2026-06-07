import React from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import type { DesignatorScheme } from '../../types';

const DesignatorToolsSection: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const circuit = useCircuitStore((s) => s.circuit);
  const setDesignatorScheme = useCircuitStore((s) => s.setDesignatorScheme);
  const setDesignatorLocation = useCircuitStore((s) => s.setDesignatorLocation);
  const bulkRenumberDesignators = useCircuitStore(
    (s) => s.bulkRenumberDesignators
  );
  const applyDesignatorScheme = useCircuitStore((s) => s.applyDesignatorScheme);

  const scheme = circuit.designatorScheme ?? 'simple';

  return (
    <div className={`rounded-md border p-2 ${tc.border}`}>
      <h3
        className={`mb-1.5 text-[11px] font-bold uppercase tracking-wide ${tc.textMuted}`}
      >
        Designator rules
      </h3>
      <p className={`mb-2 text-[10px] leading-snug ${tc.textMuted}`}>
        IEC 81346-style tags use{' '}
        <code className="text-[9px]">=location+function+number</code> (e.g.{' '}
        <code className="text-[9px]">=MCC1+Q1</code>). Bulk renumber uses
        selection when present, otherwise all devices. Function letters default
        by type (Q breaker, M motor, K contactor…).
      </p>
      <label className={`mb-1 block text-[10px] ${tc.textMuted}`}>
        Scheme
      </label>
      <select
        value={scheme}
        onChange={(e) =>
          setDesignatorScheme(e.target.value as DesignatorScheme)
        }
        className="input-field mb-2 w-full py-1 text-xs"
      >
        <option value="simple">Simple (Q1, M1)</option>
        <option value="iec81346">IEC 81346 (=LOC+Q1)</option>
      </select>
      {scheme === 'iec81346' ? (
        <>
          <label className={`mb-1 block text-[10px] ${tc.textMuted}`}>
            Location (=…)
          </label>
          <input
            type="text"
            value={circuit.designatorLocation ?? ''}
            onChange={(e) => setDesignatorLocation(e.target.value)}
            placeholder="MCC1"
            className="input-field mb-2 w-full py-1 text-xs"
          />
        </>
      ) : null}
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => bulkRenumberDesignators('row')}
          className="rounded bg-slate-600 px-2 py-1 text-[10px] text-white hover:bg-slate-500"
        >
          Renumber by row
        </button>
        <button
          type="button"
          onClick={() => bulkRenumberDesignators('column')}
          className="rounded bg-slate-600 px-2 py-1 text-[10px] text-white hover:bg-slate-500"
        >
          Renumber by column
        </button>
        <button
          type="button"
          onClick={() => applyDesignatorScheme()}
          className="rounded bg-indigo-700 px-2 py-1 text-[10px] text-white hover:bg-indigo-600"
        >
          Apply scheme to all
        </button>
      </div>
    </div>
  );
};

export default DesignatorToolsSection;
