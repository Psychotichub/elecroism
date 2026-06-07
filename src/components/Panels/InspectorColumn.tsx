import React, { useEffect, useRef, useState } from 'react';
import PropertyPanel from './PropertyPanel';
import CircuitValidationPanel from './CircuitValidationPanel';
import BmsSimulatorPanel from './BmsSimulatorPanel';
import CableSizingWizardPanel from './CableSizingWizardPanel';
import TccPlotterPanel from './TccPlotterPanel';
import OscilloscopePanel from './OscilloscopePanel';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { runCircuitDesignValidation } from '../../utils/circuitDesignValidation';

const TAB_KEY = 'electroism.inspectorTab.v1';

type TabId = 'properties' | 'validation' | 'tcc' | 'scope' | 'bms' | 'cable';

const TABS: { id: TabId; label: string }[] = [
  { id: 'properties', label: 'Properties' },
  { id: 'validation', label: 'Validation' },
  { id: 'tcc', label: 'TCC' },
  { id: 'scope', label: 'Scope' },
  { id: 'bms', label: 'BMS sim' },
  { id: 'cable', label: 'Cable' },
];

const InspectorColumn: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const circuit = useCircuitStore((s) => s.circuit);
  const simulationResult = useCircuitStore((s) => s.simulationResult);
  const tablistRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<TabId>(() => {
    try {
      const v = window.localStorage.getItem(TAB_KEY);
      if (
        v === 'validation' ||
        v === 'tcc' ||
        v === 'scope' ||
        v === 'bms' ||
        v === 'cable'
      ) {
        return v;
      }
      return 'properties';
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

  const focusTabButton = (id: TabId) => {
    tablistRef.current
      ?.querySelector<HTMLButtonElement>(`[data-tab-id="${id}"]`)
      ?.focus();
  };

  const onTabKeyDown = (e: React.KeyboardEvent, id: TabId) => {
    const idx = TABS.findIndex((t) => t.id === id);
    if (idx < 0) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = TABS[(idx + 1) % TABS.length];
      if (next) {
        setTab(next.id);
        focusTabButton(next.id);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = TABS[(idx - 1 + TABS.length) % TABS.length];
      if (next) {
        setTab(next.id);
        focusTabButton(next.id);
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      const first = TABS[0];
      if (first) {
        setTab(first.id);
        focusTabButton(first.id);
      }
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = TABS[TABS.length - 1];
      if (last) {
        setTab(last.id);
        focusTabButton(last.id);
      }
    }
  };

  const tabBtn = (id: TabId, label: string, badge?: number) => (
    <button
      type="button"
      role="tab"
      id={`inspector-tab-${id}`}
      data-tab-id={id}
      aria-selected={tab === id}
      aria-controls={`inspector-panel-${id}`}
      tabIndex={tab === id ? 0 : -1}
      onClick={() => setTab(id)}
      onKeyDown={(e) => onTabKeyDown(e, id)}
      className={`relative flex-1 px-2 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
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

  const panelId = `inspector-panel-${tab}`;

  return (
    <div
      id="inspector-panel-root"
      className={`flex h-full min-h-0 w-80 shrink-0 flex-col border-l ${tc.border} ${tc.panel}`}
    >
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="Inspector panels"
        className={`flex shrink-0 border-b ${tc.border}`}
      >
        {tabBtn('properties', 'Properties')}
        {tabBtn('validation', 'Validation', warnCount)}
        {tabBtn('tcc', 'TCC')}
        {tabBtn('scope', 'Scope')}
        {tabBtn('bms', 'BMS sim')}
        {tabBtn('cable', 'Cable')}
      </div>
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`inspector-tab-${tab}`}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        {tab === 'properties' ? (
          <PropertyPanel />
        ) : tab === 'validation' ? (
          <CircuitValidationPanel />
        ) : tab === 'tcc' ? (
          <TccPlotterPanel />
        ) : tab === 'scope' ? (
          <OscilloscopePanel />
        ) : tab === 'cable' ? (
          <CableSizingWizardPanel />
        ) : (
          <BmsSimulatorPanel />
        )}
      </div>
    </div>
  );
};

export default InspectorColumn;
