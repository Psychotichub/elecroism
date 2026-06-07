import React, { useEffect, useRef, useState } from 'react';
import PropertyPanel from './PropertyPanel';
import CircuitValidationPanel from './CircuitValidationPanel';
import BmsSimulatorPanel from './BmsSimulatorPanel';
import CableSizingWizardPanel from './CableSizingWizardPanel';
import TccPlotterPanel from './TccPlotterPanel';
import OscilloscopePanel from './OscilloscopePanel';
import DrawingLayersPanel from './DrawingLayersPanel';
import GlossaryLegendPanel from './GlossaryLegendPanel';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { runCircuitDesignValidation } from '../../utils/circuitDesignValidation';
import { getInspectorSelectionSummary } from '../../utils/inspectorSelectionSummary';
import { MOTION_CLASS } from '../../design/motion';
import { Tabs, type TabItem } from '../ui';

const TAB_KEY = 'electroism.inspectorTab.v1';
const COMPACT_TABLIST_WIDTH = 320;

type TabId =
  | 'properties'
  | 'layers'
  | 'validation'
  | 'tcc'
  | 'scope'
  | 'bms'
  | 'cable'
  | 'legend';

const PRIMARY_TAB_DEFINITIONS: { id: TabId; label: string }[] = [
  { id: 'properties', label: 'Properties' },
  { id: 'validation', label: 'Validation' },
  { id: 'layers', label: 'Layers' },
];

const OVERFLOW_TAB_DEFINITIONS: { id: TabId; label: string }[] = [
  { id: 'tcc', label: 'TCC' },
  { id: 'scope', label: 'Scope' },
  { id: 'bms', label: 'BMS sim' },
  { id: 'cable', label: 'Cable' },
  { id: 'legend', label: 'Legend' },
];

const ALL_TAB_DEFINITIONS = [
  ...PRIMARY_TAB_DEFINITIONS,
  ...OVERFLOW_TAB_DEFINITIONS,
];

const InspectorColumn: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const circuit = useCircuitStore((s) => s.circuit);
  const selectedId = useCircuitStore((s) => s.selectedId);
  const simulationResult = useCircuitStore((s) => s.simulationResult);
  const tablistRef = useRef<HTMLDivElement>(null);
  const [compactTabs, setCompactTabs] = useState(false);

  const [tab, setTab] = useState<TabId>(() => {
    try {
      const v = window.localStorage.getItem(TAB_KEY);
      if (ALL_TAB_DEFINITIONS.some((t) => t.id === v)) return v as TabId;
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

  useEffect(() => {
    const node = tablistRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? node.clientWidth;
      setCompactTabs(width < COMPACT_TABLIST_WIDTH);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const warnCount = React.useMemo(() => {
    return runCircuitDesignValidation(circuit, simulationResult).filter(
      (i) => i.severity === 'warning' || i.severity === 'error'
    ).length;
  }, [circuit, simulationResult]);

  const selectionSummary = React.useMemo(
    () => getInspectorSelectionSummary(circuit, selectedId),
    [circuit, selectedId]
  );

  const mapTabItems = React.useCallback(
    (defs: { id: TabId; label: string }[]): TabItem<TabId>[] =>
      defs.map((t) => {
        if (t.id === 'validation') {
          return {
            ...t,
            badge: warnCount,
            badgeVariant: 'warning' as const,
            badgeBumpKey: warnCount,
          };
        }
        if (t.id === 'properties' && selectionSummary) {
          return { ...t, compactLabel: selectionSummary };
        }
        return t;
      }),
    [warnCount, selectionSummary]
  );

  const primaryTabItems = React.useMemo(
    () => mapTabItems(PRIMARY_TAB_DEFINITIONS),
    [mapTabItems]
  );

  const overflowTabItems = React.useMemo(
    () => mapTabItems(OVERFLOW_TAB_DEFINITIONS),
    [mapTabItems]
  );

  const focusTabButton = (id: TabId) => {
    if (OVERFLOW_TAB_DEFINITIONS.some((t) => t.id === id)) {
      tablistRef.current
        ?.querySelector<HTMLButtonElement>('[data-testid="tab-overflow-trigger"]')
        ?.focus();
      return;
    }
    tablistRef.current
      ?.querySelector<HTMLButtonElement>(`#tab-${id}`)
      ?.focus();
  };

  const onTabKeyDown = (e: React.KeyboardEvent, id: TabId) => {
    const idx = ALL_TAB_DEFINITIONS.findIndex((t) => t.id === id);
    if (idx < 0) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = ALL_TAB_DEFINITIONS[(idx + 1) % ALL_TAB_DEFINITIONS.length];
      if (next) {
        setTab(next.id);
        focusTabButton(next.id);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const next =
        ALL_TAB_DEFINITIONS[(idx - 1 + ALL_TAB_DEFINITIONS.length) %
          ALL_TAB_DEFINITIONS.length];
      if (next) {
        setTab(next.id);
        focusTabButton(next.id);
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      const first = ALL_TAB_DEFINITIONS[0];
      if (first) {
        setTab(first.id);
        focusTabButton(first.id);
      }
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = ALL_TAB_DEFINITIONS[ALL_TAB_DEFINITIONS.length - 1];
      if (last) {
        setTab(last.id);
        focusTabButton(last.id);
      }
    }
  };

  return (
    <div
      id="inspector-panel-root"
      className={`es-inspector-root flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col ${tc.panel}`}
    >
      <div ref={tablistRef}>
        <Tabs
          items={primaryTabItems}
          overflowItems={overflowTabItems}
          overflowMenuLabel="Analysis"
          value={tab}
          onChange={setTab}
          ariaLabel="Inspector panels"
          onTabKeyDown={onTabKeyDown}
          compact={compactTabs}
          className="es-inspector-tablist"
        />
      </div>
      <div
        key={tab}
        id={`panel-${tab}`}
        role="tabpanel"
        aria-labelledby={
          OVERFLOW_TAB_DEFINITIONS.some((t) => t.id === tab)
            ? 'tab-overflow-trigger'
            : `tab-${tab}`
        }
        className={`flex min-h-0 flex-1 flex-col overflow-hidden ${MOTION_CLASS.tabCrossfade}`}
      >
        {tab === 'properties' ? (
          <PropertyPanel />
        ) : tab === 'layers' ? (
          <DrawingLayersPanel />
        ) : tab === 'validation' ? (
          <CircuitValidationPanel />
        ) : tab === 'tcc' ? (
          <TccPlotterPanel />
        ) : tab === 'scope' ? (
          <OscilloscopePanel />
        ) : tab === 'cable' ? (
          <CableSizingWizardPanel />
        ) : tab === 'legend' ? (
          <GlossaryLegendPanel />
        ) : (
          <BmsSimulatorPanel />
        )}
      </div>
    </div>
  );
};

export default InspectorColumn;
