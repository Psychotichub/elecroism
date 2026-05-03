/**
 * Shared context for PropertyPanel editor sub-components.
 *
 * Instead of passing a dozen props through every extracted editor, the
 * PropertyPanel root provides this context once, and each editor file
 * imports `usePPCtx()` to read the values it needs.
 */

import { createContext, useContext } from 'react';
import type {
  Circuit,
  CircuitComponent,
  ComponentProperties,
  NodeResult,
  Wire,
} from '../../../types';
import type { themeColors } from '../../../store/themeStore';

/** The shape of the theme-colors object (`themeColors.dark` or `themeColors.light`). */
export type ThemeColorSet = (typeof themeColors)[keyof typeof themeColors];

export interface PropertyPanelContextValue {
  /* ---- theme ---- */
  theme: 'dark' | 'light';
  tc: ThemeColorSet;

  /* ---- selection ---- */
  selectedComp: CircuitComponent | undefined;
  selectedWire: Wire | undefined;
  nodeResult: NodeResult | null;
  circuit: Circuit;

  /* ---- actions ---- */
  updateProp: (
    updates: Partial<ComponentProperties> & {
      multimeterSignal?: 'auto' | 'ac' | 'dc';
    }
  ) => void;
  updateComponent: (
    id: string,
    updates: Partial<CircuitComponent>
  ) => void;
  updateWire: (id: string, updates: Partial<Wire>) => void;
  toggleComponent: (id: string) => void;
  resetTripped: (id: string) => void;
  removeComponent: (id: string) => void;
  rotateComponent: (id: string) => void;
  duplicateComponent: (id: string) => void;
  setComponentPhaseSystem: (
    id: string,
    phase: 'single_phase' | 'three_phase'
  ) => void;
  setMcbPoleLayout: (id: string, poles: 1 | 2) => void;

  /* ---- BMS helpers ---- */
  acbBmsClosePulse: (id: string) => void;
  acbBmsShuntOpen: (id: string) => void;
  mccbBmsMotorClosePulse: (id: string) => void;
  mccbBmsShuntOpen: (id: string) => void;
}

const PPCtx = createContext<PropertyPanelContextValue | null>(null);

/**
 * Hook for editor sub-components to access PropertyPanel shared state.
 * Must be called inside a `<PropertyPanelProvider>`.
 */
export function usePPCtx(): PropertyPanelContextValue {
  const v = useContext(PPCtx);
  if (!v) {
    throw new Error('usePPCtx must be used inside PropertyPanelProvider');
  }
  return v;
}

export const PropertyPanelProvider = PPCtx.Provider;
