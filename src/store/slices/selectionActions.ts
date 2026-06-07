import type { CircuitComponent } from '../../types';
import { runCircuitDesignValidation } from '../../utils/circuitDesignValidation';
import {
  componentIdsFaulted,
  componentIdsWithUnwiredTerminals,
  selectAllOfTypeQuery,
  viewportForComponents,
} from '../../utils/drawingSearch';
import type { CircuitStoreGet, CircuitStoreSet } from './sliceTypes';

export function createSelectionActions(
  set: CircuitStoreSet,
  get: CircuitStoreGet
) {
  return {
    selectComponents: (ids: string[]) => {
      const unique = [...new Set(ids)];
      const idSet = new Set(unique);
      set((state) => ({
        selectedId: unique[0] ?? null,
        wireGripVertexIndex: null,
        circuit: {
          ...state.circuit,
          components: state.circuit.components.map((c: CircuitComponent) => ({
            ...c,
            selected: idSet.has(c.id),
          })),
        },
      }));
    },

    focusComponents: (ids: string[]) => {
      const unique = [...new Set(ids)];
      if (unique.length === 0) return false;
      get().selectComponents(unique);
      const vp = viewportForComponents(get().circuit, unique);
      if (vp) {
        get().setZoom(vp.zoom);
        get().setPan(vp.panX, vp.panY);
      }
      get().setTool('select');
      return true;
    },

    jumpToLabel: (labelQuery: string) => {
      const q = labelQuery.trim().toLowerCase();
      if (!q) return false;
      const comp = get().circuit.components.find(
        (c: CircuitComponent) => c.label.trim().toLowerCase() === q
      );
      if (!comp) {
        const partial = get().circuit.components.filter((c: CircuitComponent) =>
          c.label.trim().toLowerCase().includes(q)
        );
        if (partial.length === 0) return false;
        return get().focusComponents(partial.map((c: CircuitComponent) => c.id));
      }
      return get().focusComponents([comp.id]);
    },

    selectAllOfType: (typeQuery: string) => {
      const ids = selectAllOfTypeQuery(get().circuit, typeQuery);
      if (ids.length === 0) return false;
      get().selectComponents(ids);
      get().setTool('select');
      return true;
    },

    selectUnwiredComponents: () => {
      const ids = componentIdsWithUnwiredTerminals(get().circuit);
      if (ids.length === 0) return false;
      get().focusComponents(ids);
      return true;
    },

    selectFaultedComponents: () => {
      const ids = componentIdsFaulted(
        get().circuit,
        get().simulationResult,
        runCircuitDesignValidation(get().circuit, get().simulationResult)
      );
      if (ids.length === 0) return false;
      get().focusComponents(ids);
      return true;
    },
  };
}
