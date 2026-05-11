/**
 * Component actions slice for circuitStore.
 *
 * Handles add, update, remove, move, rotate, duplicate, toggle, reset,
 * phase system change, MCB pole layout, and push button press.
 */

import type {
  CircuitComponent,
  ComponentType,
  PhaseSystem,
  Wire,
} from '../../types';
import { v4 as uuid } from 'uuid';
import { clampComponentScale } from '../../utils/geometry';
import {
  syncWireEndpoints,
  createConnectionPoints,
  mcbLayoutPoles,
  remapWireEndpointsForMorph,
  buildPointRemapByLabels,
} from '../circuitConnectionGeometry';
import {
  resolveTypeFromPhasePreference,
  morphLabelPairs,
  mergedPropsMorph,
} from '../circuitPhaseMorph';
import {
  getDefaultProperties,
  getDefaultLabel,
  getInitialState,
} from '../circuitDefaults';
import {
  refreshAutoWireNumbers,
} from '../../utils/wireEndpointNumbering';

import type { CircuitStoreSet, CircuitStoreGet } from './sliceTypes';
import { globalMouseContext } from '../circuitStore';

export function createComponentActions(set: CircuitStoreSet, get: CircuitStoreGet) {
  return {
    addComponent: (
      type: ComponentType,
      x: number,
      y: number,
      options?: {
        pushButtonVariant?: 'NO' | 'NC';
        mcbInitialPoles?: 1 | 2;
        initialScale?: number;
      }
    ) => {
      const id = uuid();
      const baseProps = getDefaultProperties(type);
      let properties =
        type === 'push_button' && options?.pushButtonVariant === 'NC'
          ? { ...baseProps, buttonType: 'NC' as const }
          : baseProps;
      if (type === 'mcb' && options?.mcbInitialPoles === 2) {
        properties = { ...properties, poles: 2 };
      }
      const mcbPolesForCp =
        type === 'mcb' ? (properties.poles === 2 ? 2 : 1) : undefined;
      const rcdPolesForCp =
        type === 'rcd' || type === 'residual_current_circuit_breaker'
          ? properties.poles === 4
            ? 4
            : 2
          : undefined;
      const busbarLeftCountForCp =
        type === 'busbar' ||
        type === 'busbar_system' ||
        type === 'neutral_bar_system' ||
        type === 'earth_bar_grounding_system'
          ? Math.max(1, Number(properties.busbarLeftCount ?? 3) || 3)
          : undefined;
      const busbarRightCountForCp =
        type === 'busbar' ||
        type === 'busbar_system' ||
        type === 'neutral_bar_system' ||
        type === 'earth_bar_grounding_system'
          ? Math.max(1, Number(properties.busbarRightCount ?? 3) || 3)
          : undefined;
      const newComp: CircuitComponent = {
        id,
        type,
        label: getDefaultLabel(type),
        x,
        y,
        scale: clampComponentScale(options?.initialScale ?? 1),
        rotation: 0,
        state: getInitialState(type),
        ...(type === 'push_button' ? { pressed: false } : {}),
        selected: false,
        connectionPoints: createConnectionPoints(id, type, {
          mcbPoles: mcbPolesForCp,
          rcdPoles: rcdPolesForCp,
          busbarLeftCount: busbarLeftCountForCp,
          busbarRightCount: busbarRightCountForCp,
        }),
        properties,
      };
      set((state) => ({
        circuit: {
          ...state.circuit,
          components: [...state.circuit.components, newComp],
          updatedAt: new Date().toISOString(),
        },
      }));
      get().pushHistory(`Added ${type}`);
      get().runSimulation();
    },

    setMcbPoleLayout: (id: string, poles: 1 | 2) => {
      const circuit = get().circuit;
      const comp = circuit.components.find((c: CircuitComponent) => c.id === id);
      if (!comp || comp.type !== 'mcb') return;
      const clamped: 1 | 2 = poles === 2 ? 2 : 1;
      const prevLayout = mcbLayoutPoles(comp);
      if (prevLayout === clamped) {
        if (comp.properties.poles !== clamped) {
          get().updateComponent(id, {
            properties: { ...comp.properties, poles: clamped },
          });
          get().pushHistory(`MCB poles: ${clamped}P`);
        }
        return;
      }
      const newCps = createConnectionPoints(comp.id, 'mcb', { mcbPoles: clamped });
      const pairs: [string, string][] =
        prevLayout === 1 && clamped === 2
          ? [['IN', '1'], ['OUT', '2'], ['1', '1'], ['2', '2']]
          : [['IN_L', '1'], ['OUT_L', '2'], ['IN_N', '1'], ['OUT_N', '2'], ['1', '1'], ['2', '2'], ['3', '1'], ['4', '2']];
      const remap = buildPointRemapByLabels(comp, newCps, pairs);
      const newWires = remapWireEndpointsForMorph(circuit.wires, comp.id, remap);
      const newComp: CircuitComponent = {
        ...comp,
        properties: { ...comp.properties, poles: clamped },
        connectionPoints: newCps,
      };
      const updatedCircuit = syncWireEndpoints({
        ...circuit,
        components: circuit.components.map((c: CircuitComponent) => (c.id === id ? newComp : c)),
        wires: newWires,
        updatedAt: new Date().toISOString(),
      });
      set({ circuit: updatedCircuit });
      get().pushHistory(`MCB ${clamped}P layout`);
      get().runSimulation();
    },

    setPushButtonPressed: (id: string, pressed: boolean) => {
      set((state) => ({
        circuit: {
          ...state.circuit,
          components: state.circuit.components.map((c: CircuitComponent) =>
            c.id === id && c.type === 'push_button' ? { ...c, pressed } : c
          ),
          updatedAt: new Date().toISOString(),
        },
      }));
      get().runSimulation();
    },

    updateComponent: (id: string, updates: Partial<CircuitComponent>) => {
      const next: Partial<CircuitComponent> =
        updates.scale !== undefined
          ? { ...updates, scale: clampComponentScale(updates.scale) }
          : updates;
      set((state) => {
        let circuit = syncWireEndpoints({
          ...state.circuit,
          components: state.circuit.components.map((c: CircuitComponent) =>
            c.id === id ? { ...c, ...next } : c
          ),
          updatedAt: new Date().toISOString(),
        });
        if (next.label !== undefined || next.connectionPoints !== undefined) {
          circuit = refreshAutoWireNumbers(circuit);
        }
        return { circuit };
      });
      get().runSimulation();
    },

    setComponentPhaseSystem: (id: string, phase: PhaseSystem) => {
      const circuit = get().circuit;
      const comp = circuit.components.find((c: CircuitComponent) => c.id === id);
      if (!comp) return;
      const nextType = resolveTypeFromPhasePreference(comp.type, phase);
      if (nextType === comp.type) {
        get().updateComponent(id, { properties: { ...comp.properties, phaseSystem: phase } });
        get().pushHistory(`Phase system: ${phase}`);
        return;
      }
      const newProps = mergedPropsMorph(comp, nextType);
      const mcbPolesForCp = nextType === 'mcb' ? (newProps.poles === 2 ? 2 : 1) : undefined;
      const rcdPolesForCpMorph =
        nextType === 'rcd' || nextType === 'residual_current_circuit_breaker'
          ? (newProps.poles ?? 2) >= 4 ? 4 : 2
          : undefined;
      const newCps = createConnectionPoints(comp.id, nextType, {
        mcbPoles: mcbPolesForCp,
        rcdPoles: rcdPolesForCpMorph,
      });
      const pairs = morphLabelPairs(comp, nextType);
      if (!pairs) {
        get().updateComponent(id, { properties: { ...comp.properties, phaseSystem: phase } });
        get().pushHistory(`Phase system: ${phase}`);
        return;
      }
      const remap = buildPointRemapByLabels(comp, newCps, pairs);
      const newComp: CircuitComponent = {
        id: comp.id, type: nextType, label: comp.label,
        x: comp.x, y: comp.y, rotation: comp.rotation, state: comp.state,
        selected: comp.selected, connectionPoints: newCps, properties: newProps,
      };
      const newWires = remapWireEndpointsForMorph(circuit.wires, comp.id, remap);
      const updatedCircuit = refreshAutoWireNumbers(
        syncWireEndpoints({
          ...circuit,
          components: circuit.components.map((c: CircuitComponent) => (c.id === id ? newComp : c)),
          wires: newWires,
          updatedAt: new Date().toISOString(),
        })
      );
      set({ circuit: updatedCircuit });
      get().pushHistory(`Phase ${phase}: ${comp.type} → ${nextType}`);
      get().runSimulation();
    },

    toggleComponent: (id: string) => {
      const comp = get().circuit.components.find((c: CircuitComponent) => c.id === id);
      if (!comp) return;
      const toggleable = [
        'switch', 'two_way_switch', 'mcb', 'hrc_fuse', 'control_circuit_fuse',
        'earth_leakage_relay_cbct', 'rcd', 'residual_current_circuit_breaker',
        'three_phase_mcb', 'mccb', 'motor_protection_circuit_breaker',
        'four_phase_mcb', 'motorized_mccb', 'four_pole_motorized_mccb',
        'air_circuit_breaker', 'estop', 'door_interlock', 'mechanical_interlock',
        'key_interlock', 'aux_contact_block',
      ];
      if (toggleable.includes(comp.type) && comp.state !== 'tripped') {
        if (comp.type === 'aux_contact_block' && comp.properties.auxContactFollowContactorId?.trim()) return;
        const newState = comp.state === 'on' ? 'off' : 'on';
        get().updateComponent(id, { state: newState });
        get().pushHistory(`Toggled ${comp.label}`);
      }
    },

    resetTripped: (id: string) => {
      const comp = get().circuit.components.find((c: CircuitComponent) => c.id === id);
      const nextState = comp?.type === 'three_phase_motor' ? 'on' : 'off';
      const updates: Partial<CircuitComponent> = { state: nextState };
      if (comp?.type === 'air_circuit_breaker') updates.acbSimState = undefined;
      get().updateComponent(id, updates);
      get().pushHistory('Reset protection / fault');
    },

    removeComponent: (id: string) => {
      set((state) => ({
        circuit: {
          ...state.circuit,
          components: state.circuit.components.filter((c: CircuitComponent) => c.id !== id),
          wires: state.circuit.wires.filter((w: Wire) => w.fromComponentId !== id && w.toComponentId !== id),
          updatedAt: new Date().toISOString(),
        },
        selectedId: state.selectedId === id ? null : state.selectedId,
      }));
      get().pushHistory('Removed component');
      get().runSimulation();
    },

    moveComponent: (id: string, x: number, y: number) => {
      const gridSize = get().circuit.gridSize;
      const snappedX = Math.round(x / gridSize) * gridSize;
      const snappedY = Math.round(y / gridSize) * gridSize;
      const circuit = get().circuit;
      const prev = circuit.components.find((c: CircuitComponent) => c.id === id);
      if (!prev) return;
      const dx = snappedX - prev.x;
      const dy = snappedY - prev.y;
      if (dx === 0 && dy === 0) return;

      const isDraggedSelected = prev.selected || get().selectedId === id;
      const movingIds = new Set<string>();
      if (isDraggedSelected) {
        circuit.components.forEach((c) => {
          if (c.selected || c.id === get().selectedId) movingIds.add(c.id);
        });
      } else {
        movingIds.add(id);
      }

      const wires = circuit.wires.map((w: Wire) => {
        const touches = movingIds.has(w.fromComponentId) || movingIds.has(w.toComponentId);
        if (!touches || w.points.length <= 4) return w;
        const pts = [...w.points];
        for (let i = 2; i < pts.length - 2; i += 2) { pts[i] += dx; pts[i + 1] += dy; }
        return { ...w, points: pts };
      });
      set({
        circuit: syncWireEndpoints({
          ...circuit,
          components: circuit.components.map((c: CircuitComponent) => 
            movingIds.has(c.id) ? { ...c, x: c.x + dx, y: c.y + dy } : c
          ),
          wires,
        }),
      });
    },

    /**
     * Called every pointer-move tick while a component is being Konva-dragged.
     * Sets peer selected components to their INITIAL position + the total drag offset
     * so there is zero accumulation error and distances are always exact.
     *
     * @param draggedId    - the component being physically dragged by the user
     * @param initialPositions - { [id]: {x, y} } captured at dragStart for every selected component
     * @param totalDx / totalDy - total world-space displacement of the dragged node from its initial position
     */
    dragMoveSelection: (
      draggedId: string,
      initialPositions: Record<string, { x: number; y: number }>,
      totalDx: number,
      totalDy: number
    ) => {
      const circuit = get().circuit;
      const peers = circuit.components.filter(
        (c) => c.id !== draggedId && !!initialPositions[c.id]
      );
      if (peers.length === 0) return;
      const peerIds = new Set(peers.map((c) => c.id));
      // Wire intermediate vertices: shift by total offset from their initial positions too.
      // We don't store per-vertex initial positions so we just sync endpoints via syncWireEndpoints.
      set({
        circuit: syncWireEndpoints({
          ...circuit,
          components: circuit.components.map((c: CircuitComponent) => {
            if (!peerIds.has(c.id)) return c;
            const init = initialPositions[c.id];
            return { ...c, x: init.x + totalDx, y: init.y + totalDy };
          }),
          wires: circuit.wires,
        }),
      });
    },

    copySelection: () => {
      const circuit = get().circuit;
      const selectedComponents = circuit.components.filter((c) => c.selected || c.id === get().selectedId);
      if (selectedComponents.length === 0) return;
      const selectedIds = new Set(selectedComponents.map((c) => c.id));
      const selectedWires = circuit.wires.filter(
        (w) => selectedIds.has(w.fromComponentId) && selectedIds.has(w.toComponentId)
      );
      set({ clipboard: { components: structuredClone(selectedComponents), wires: structuredClone(selectedWires) } });
    },

    cutSelection: () => {
      const circuit = get().circuit;
      const selectedComponents = circuit.components.filter((c) => c.selected || c.id === get().selectedId);
      if (selectedComponents.length === 0) return;
      const selectedIds = new Set(selectedComponents.map((c) => c.id));
      const selectedWires = circuit.wires.filter(
        (w) => selectedIds.has(w.fromComponentId) && selectedIds.has(w.toComponentId)
      );
      // Copy to clipboard first, then delete.
      set((state) => ({
        clipboard: { components: structuredClone(selectedComponents), wires: structuredClone(selectedWires) },
        selectedId: null,
        circuit: {
          ...state.circuit,
          components: state.circuit.components.filter((c) => !selectedIds.has(c.id)),
          wires: state.circuit.wires.filter(
            (w) => !selectedIds.has(w.fromComponentId) && !selectedIds.has(w.toComponentId)
          ),
          updatedAt: new Date().toISOString(),
        },
      }));
      get().pushHistory('Cut components');
      get().runSimulation();
    },

    pasteSelection: () => {
      const clipboard = get().clipboard;
      if (!clipboard || clipboard.components.length === 0) return;
      const circuit = get().circuit;
      const idMap = new Map<string, string>();
      const pointIdMap = new Map<string, string>();
      
      let offsetX = circuit.gridSize * 2;
      let offsetY = circuit.gridSize * 2;

      if (globalMouseContext.isOverCanvas) {
        let minX = Infinity;
        let minY = Infinity;
        clipboard.components.forEach((c) => {
          if (c.x < minX) minX = c.x;
          if (c.y < minY) minY = c.y;
        });
        const targetX = Math.round(globalMouseContext.worldX / circuit.gridSize) * circuit.gridSize;
        const targetY = Math.round(globalMouseContext.worldY / circuit.gridSize) * circuit.gridSize;
        offsetX = targetX - minX;
        offsetY = targetY - minY;
      }

      const newComponents = clipboard.components.map((c) => {
        const newId = uuid();
        idMap.set(c.id, newId);
        const newConnectionPoints = c.connectionPoints.map((cp) => {
          const newCpId = uuid();
          pointIdMap.set(cp.id, newCpId);
          return { ...cp, id: newCpId, componentId: newId };
        });
        return {
          ...c,
          id: newId,
          x: c.x + offsetX,
          y: c.y + offsetY,
          connectionPoints: newConnectionPoints,
          selected: true,
        };
      });

      const newWires = clipboard.wires.map((w) => ({
        ...w,
        id: uuid(),
        fromComponentId: idMap.get(w.fromComponentId)!,
        fromPointId: pointIdMap.get(w.fromPointId)!,
        toComponentId: idMap.get(w.toComponentId)!,
        toPointId: pointIdMap.get(w.toPointId)!,
        points: w.points.map((p, i) => p + (i % 2 === 0 ? offsetX : offsetY)),
      }));

      const nextClipboard = { components: structuredClone(newComponents), wires: structuredClone(newWires) };
      set((state) => ({
        clipboard: nextClipboard,
        selectedId: null,
        circuit: syncWireEndpoints({
          ...state.circuit,
          components: [
            ...state.circuit.components.map((c) => ({ ...c, selected: false })),
            ...newComponents,
          ],
          wires: [...state.circuit.wires, ...newWires],
        }),
      }));
      get().pushHistory('Pasted components');
    },

    rotateComponent: (id: string) => {
      const comp = get().circuit.components.find((c: CircuitComponent) => c.id === id);
      if (!comp) return;
      const nextRot = (comp.rotation + 90) % 360;
      set((state) => ({
        circuit: syncWireEndpoints({
          ...state.circuit,
          components: state.circuit.components.map((c: CircuitComponent) => (c.id === id ? { ...c, rotation: nextRot } : c)),
          updatedAt: new Date().toISOString(),
        }),
      }));
      get().pushHistory(`Rotated ${comp.label}`);
      get().runSimulation();
    },

    duplicateComponent: (id: string) => {
      const comp = get().circuit.components.find((c: CircuitComponent) => c.id === id);
      if (!comp) return;
      const baseScale = { initialScale: comp.scale ?? 1 };
      get().addComponent(
        comp.type,
        comp.x + 60,
        comp.y + 60,
        comp.type === 'push_button'
          ? { pushButtonVariant: comp.properties.buttonType === 'NC' ? 'NC' : 'NO', ...baseScale }
          : comp.type === 'mcb'
            ? { mcbInitialPoles: mcbLayoutPoles(comp), ...baseScale }
            : baseScale
      );
    },
  };
}
