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
      const comp = circuit.components.find((c) => c.id === id);
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
        components: circuit.components.map((c) => (c.id === id ? newComp : c)),
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
          components: state.circuit.components.map((c) =>
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
          components: state.circuit.components.map((c) =>
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
      const comp = circuit.components.find((c) => c.id === id);
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
          components: circuit.components.map((c) => (c.id === id ? newComp : c)),
          wires: newWires,
          updatedAt: new Date().toISOString(),
        })
      );
      set({ circuit: updatedCircuit });
      get().pushHistory(`Phase ${phase}: ${comp.type} → ${nextType}`);
      get().runSimulation();
    },

    toggleComponent: (id: string) => {
      const comp = get().circuit.components.find((c) => c.id === id);
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
      const comp = get().circuit.components.find((c) => c.id === id);
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
          components: state.circuit.components.filter((c) => c.id !== id),
          wires: state.circuit.wires.filter((w) => w.fromComponentId !== id && w.toComponentId !== id),
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
      const prev = circuit.components.find((c) => c.id === id);
      if (!prev) return;
      const dx = snappedX - prev.x;
      const dy = snappedY - prev.y;
      let wires = circuit.wires;
      if (dx !== 0 || dy !== 0) {
        wires = circuit.wires.map((w) => {
          const touches = w.fromComponentId === id || w.toComponentId === id;
          if (!touches || w.points.length <= 4) return w;
          const pts = [...w.points];
          for (let i = 2; i < pts.length - 2; i += 2) { pts[i] += dx; pts[i + 1] += dy; }
          return { ...w, points: pts };
        });
      }
      set({
        circuit: syncWireEndpoints({
          ...circuit,
          components: circuit.components.map((c) => (c.id === id ? { ...c, x: snappedX, y: snappedY } : c)),
          wires,
        }),
      });
    },

    rotateComponent: (id: string) => {
      const comp = get().circuit.components.find((c) => c.id === id);
      if (!comp) return;
      const nextRot = (comp.rotation + 90) % 360;
      set((state) => ({
        circuit: syncWireEndpoints({
          ...state.circuit,
          components: state.circuit.components.map((c) => (c.id === id ? { ...c, rotation: nextRot } : c)),
          updatedAt: new Date().toISOString(),
        }),
      }));
      get().pushHistory(`Rotated ${comp.label}`);
      get().runSimulation();
    },

    duplicateComponent: (id: string) => {
      const comp = get().circuit.components.find((c) => c.id === id);
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
