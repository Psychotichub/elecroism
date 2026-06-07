import type { CircuitComponent, DesignatorScheme } from '../../types';
import { refreshAutoWireNumbers } from '../../utils/wireEndpointNumbering';
import {
  applyDesignatorSchemeToCircuit,
  bulkRenumberDesignators,
  type SpatialRenumberOrder,
} from '../../utils/designatorRules';
import type { CircuitStoreGet, CircuitStoreSet } from './sliceTypes';

function selectedTargetIds(get: CircuitStoreGet): Set<string> | undefined {
  const { circuit, selectedId } = get();
  const selected = circuit.components.filter(
    (c: CircuitComponent) => c.selected || c.id === selectedId
  );
  if (selected.length === 0) return undefined;
  return new Set(selected.map((c: CircuitComponent) => c.id));
}

export function createDesignatorActions(
  set: CircuitStoreSet,
  get: CircuitStoreGet
) {
  return {
    setDesignatorScheme: (scheme: DesignatorScheme) => {
      set((state) => ({
        circuit: {
          ...state.circuit,
          designatorScheme: scheme,
          updatedAt: new Date().toISOString(),
        },
      }));
    },

    setDesignatorLocation: (location: string) => {
      set((state) => ({
        circuit: {
          ...state.circuit,
          designatorLocation: location.trim(),
          updatedAt: new Date().toISOString(),
        },
      }));
    },

    bulkRenumberDesignators: (order: SpatialRenumberOrder) => {
      const targets = selectedTargetIds(get);
      let circuit = bulkRenumberDesignators(
        get().circuit,
        order,
        targets
      );
      circuit = refreshAutoWireNumbers(circuit);
      set({ circuit });
      get().pushHistory(
        `Renumber designators (${order}${targets ? ', selection' : ''})`
      );
      get().runSimulation();
    },

    applyDesignatorScheme: () => {
      let circuit = applyDesignatorSchemeToCircuit(get().circuit);
      circuit = refreshAutoWireNumbers(circuit);
      set({ circuit });
      get().pushHistory('Apply designator scheme');
      get().runSimulation();
    },
  };
}
