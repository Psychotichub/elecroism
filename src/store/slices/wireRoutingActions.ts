import type { Wire } from '../../types';
import { syncWireEndpoints } from '../circuitConnectionGeometry';
import { finalizeWirePolylineForCommit } from '../../utils/wireGripUtils';
import {
  bundleParallelWires,
  rerouteWireWithAutoAvoid,
} from '../../utils/wireBundle';
import type { CircuitStoreGet, CircuitStoreSet } from './sliceTypes';

export function createWireRoutingActions(
  set: CircuitStoreSet,
  get: CircuitStoreGet
) {
  return {
    setWirePointsLiveBatch: (
      updates: { wireId: string; points: number[] }[]
    ) => {
      if (updates.length === 0) return;
      const map = new Map(updates.map((u) => [u.wireId, u.points]));
      set((state) => ({
        circuit: {
          ...state.circuit,
          wires: state.circuit.wires.map((w: Wire) => {
            const pts = map.get(w.id);
            return pts ? { ...w, points: pts.slice() } : w;
          }),
          updatedAt: new Date().toISOString(),
        },
      }));
    },

    commitWireSegmentBundle: (wireIds: string[]) => {
      const state = get();
      let circuit = state.circuit;
      const ids = [...new Set(wireIds)];
      for (const wireId of ids) {
        const wire = circuit.wires.find((w: Wire) => w.id === wireId);
        if (!wire) continue;
        const finalized = finalizeWirePolylineForCommit(circuit, wire, {
          draggedVertexIndex: null,
          gridSnapEnabled: state.wireGridSnapEnabled,
          gridSize: state.circuit.gridSize,
          zoom: state.circuit.zoom,
        });
        circuit = {
          ...circuit,
          wires: circuit.wires.map((w: Wire) =>
            w.id === wireId ? finalized : w
          ),
        };
      }
      set({
        circuit: syncWireEndpoints({
          ...circuit,
          updatedAt: new Date().toISOString(),
        }),
        wireGripVertexIndex: null,
      });
      get().pushHistory(
        ids.length > 1 ? 'Moved wire bundle' : 'Moved wire segment'
      );
      get().runSimulation();
    },

    bundleParallelWires: (wireId?: string) => {
      const id = wireId ?? get().selectedId;
      if (!id) return false;
      const wire = get().circuit.wires.find((w: Wire) => w.id === id);
      if (!wire) return false;
      const next = bundleParallelWires(get().circuit, id);
      set({
        circuit: syncWireEndpoints(next),
      });
      get().pushHistory('Spaced parallel wire bundle');
      get().runSimulation();
      return true;
    },

    autoRerouteWire: (wireId?: string) => {
      const id = wireId ?? get().selectedId;
      if (!id) return 'Select a wire first';
      const state = get();
      const wire = state.circuit.wires.find((w: Wire) => w.id === id);
      if (!wire) return 'Wire not found';
      const nextPts = rerouteWireWithAutoAvoid(state.circuit, wire);
      if (!nextPts || nextPts.length < 4) {
        return 'Could not auto-route between endpoints';
      }
      const draft = { ...wire, points: nextPts };
      const finalized = finalizeWirePolylineForCommit(state.circuit, draft, {
        draggedVertexIndex: null,
        gridSnapEnabled: state.wireGridSnapEnabled,
        gridSize: state.circuit.gridSize,
        zoom: state.circuit.zoom,
      });
      set({
        circuit: syncWireEndpoints({
          ...state.circuit,
          wires: state.circuit.wires.map((w: Wire) =>
            w.id === id ? finalized : w
          ),
          updatedAt: new Date().toISOString(),
        }),
        wireGripVertexIndex: null,
      });
      get().pushHistory('Auto-rerouted wire');
      get().runSimulation();
      return '';
    },
  };
}
