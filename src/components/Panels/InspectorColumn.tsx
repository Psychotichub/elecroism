import React, { useEffect, useState } from 'react';
import PropertyPanel from './PropertyPanel';
import CircuitValidationPanel from './CircuitValidationPanel';
import BmsSimulatorPanel from './BmsSimulatorPanel';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { runCircuitDesignValidation } from '../../utils/circuitDesignValidation';

const TAB_KEY = 'electroism.inspectorTab.v1';

type TabId = 'properties' | 'validation' | 'bms';

const InspectorColumn: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const circuit = useCircuitStore((s) => s.circuit);
  const simulationResult = useCircuitStore((s) => s.simulationResult);

  const [tab, setTab] = useState<TabId>(() => {
    try {
      const v = window.localStorage.getItem(TAB_KEY);
      return v === 'validation' ? 'validation' : 'properties';
    } catch {
      return 'properties';
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(TAB_KEY, tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  const warnCount = React.useMemo(() => {
    return runCircuitDesignValidation(circuit, simulationResult).filter(
      (i) => i.severity === 'warning' || i.severity === 'error'
    ).length;
  }, [circuit, simulationResult]);

  const tabBtn = (id: TabId, label: string, badge?: number) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`relative flex-1 px-2 py-2 text-xs font-semibold transition-colors ${
        tab === id
          ? `${tc.textBright} border-b-2 border-blue-500`
          : `${tc.textMuted} border-b-2 border-transparent hover:opacity-90`
      }`}
    >
      {label}
      {id === 'validation' && badge !== undefined && badge > 0 ? (
        <span
          className="absolute right-1 top-1 min-w-[1rem] rounded-full bg-amber-600 px-1 text-center text-[9px] font-bold leading-4 text-white"
          aria-label={`${badge} warnings or errors`}
        >
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </button>
  );

  return (
    <div
      className={`flex h-full min-h-0 w-80 shrink-0 flex-col border-l ${tc.border} ${tc.panel}`}
    >
      <div className={`flex shrink-0 border-b ${tc.border}`}>
        {tabBtn('properties', 'Properties')}
        {tabBtn('validation', 'Validation', warnCount)}
        {tabBtn('bms', 'BMS sim')}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === 'properties' ? (
          <PropertyPanel />
        ) : tab === 'validation' ? (
          <CircuitValidationPanel />
        ) : (
          <BmsSimulatorPanel />
        )}
      </div>
    </div>
  );
};

export default InspectorColumn;
