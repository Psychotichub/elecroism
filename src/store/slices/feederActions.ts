import type { CircuitComponent } from '../../types';
import { syncWireEndpoints } from '../circuitConnectionGeometry';
import type { CircuitStoreGet, CircuitStoreSet } from './sliceTypes';
import {
  canStartBusDrop,
  duplicateIdenticalFeeder,
  isFeederRootType,
} from '../../utils/busDrop';

export function createFeederActions(set: CircuitStoreSet, get: CircuitStoreGet) {
  return {
    dropFeederAtBusTap: (worldX: number, worldY: number) => {
      const wip = get().wireInProgress;
      if (!wip?.fromComponentId || !wip.fromPointId) return false;

      const result = duplicateIdenticalFeeder(get().circuit, {
        seedBusbarId: wip.fromComponentId,
        seedTapPointId: wip.fromPointId,
        dropX: worldX,
        dropY: worldY,
      });
      if (!result || !result.newBreakerId) return false;

      set({
        circuit: syncWireEndpoints(result.circuit),
        wireInProgress: null,
        wirePoints: [],
        wireOrientation: 'h',
        selectedId: result.newBreakerId,
      });
      get().pushHistory('Bus-drop feeder');
      get().runSimulation();
      return true;
    },

    duplicateIdenticalFeeder: (breakerId?: string) => {
      const id =
        breakerId ??
        get().selectedId ??
        get().circuit.components.find((c: CircuitComponent) => c.selected)
          ?.id;
      if (!id) return false;
      const comp = get().circuit.components.find(
        (c: CircuitComponent) => c.id === id
      );
      if (!comp || !isFeederRootType(comp.type)) return false;

      const result = duplicateIdenticalFeeder(get().circuit, {
        templateBreakerId: id,
      });
      if (!result || !result.newBreakerId) return false;

      set({
        circuit: syncWireEndpoints(result.circuit),
        selectedId: result.newBreakerId,
      });
      get().pushHistory('Duplicate identical feeder');
      get().runSimulation();
      return true;
    },

    isBusDropWireActive: (): boolean => {
      const wip = get().wireInProgress;
      if (!wip?.fromComponentId || !wip.fromPointId) return false;
      return canStartBusDrop(
        get().circuit,
        wip.fromComponentId,
        wip.fromPointId
      );
    },
  };
}
