import { create } from 'zustand';
import type {
  Circuit,
  CircuitComponent,
  Wire,
  SimulationResult,
  ToolMode,
  HistoryEntry,
  ComponentType,
  FaultEvent,
  PhaseSystem,
} from '../types';
import { engine } from '../simulation/engine';
import { v4 as uuid } from 'uuid';
import {
  clampComponentScale,
  connectionPointWorld,
  orthogonalLeg,
  terminalOutwardOrientation,
} from '../utils/geometry';
import { inferWireColorFromSingleTerminal } from '../utils/inferWireColor';
import {
  syncWireEndpoints,
  createConnectionPoints,
  labelNorm,
  inferWireMetadata,
  mcbLayoutPoles,
  remapWireEndpointsForMorph,
  buildPointRemapByLabels,
  ensureBreakerControlTerminals,
} from './circuitConnectionGeometry';
import {
  resolveTypeFromPhasePreference,
  morphLabelPairs,
  mergedPropsMorph,
} from './circuitPhaseMorph';
import {
  getDefaultProperties,
  getDefaultLabel,
  getInitialState,
  createEmptyCircuit,
} from './circuitDefaults';

interface CircuitStore {
  circuit: Circuit;
  simulationResult: SimulationResult | null;
  selectedId: string | null;
  tool: ToolMode;
  wireInProgress: Partial<Wire> | null;
  wirePoints: number[];
  /** Axis the next leg of the in-progress wire will follow ('h' = horizontal,
   *  'v' = vertical). Seeded from the start terminal's outward direction so
   *  the first segment leaves the terminal perpendicular to the component;
   *  toggles after every committed leg so subsequent clicks alternate. */
  wireOrientation: 'h' | 'v';
  history: HistoryEntry[];
  historyIndex: number;
  faultDialogEvent: FaultEvent | null;

  addComponent: (
    type: ComponentType,
    x: number,
    y: number,
    options?: {
      pushButtonVariant?: 'NO' | 'NC';
      mcbInitialPoles?: 1 | 2;
      initialScale?: number;
    }
  ) => void;
  setMcbPoleLayout: (id: string, poles: 1 | 2) => void;
  setPushButtonPressed: (id: string, pressed: boolean) => void;
  updateComponent: (
    id: string,
    updates: Partial<CircuitComponent>
  ) => void;
  setComponentPhaseSystem: (id: string, phase: PhaseSystem) => void;
  removeComponent: (id: string) => void;
  toggleComponent: (id: string) => void;
  resetTripped: (id: string) => void;
  /** BMS closing coil (CC) pulse — closes main contacts if interlocks OK */
  acbBmsClosePulse: (id: string) => void;
  /** BMS shunt trip — opens main contacts (remote OFF) */
  acbBmsShuntOpen: (id: string) => void;
  mccbBmsMotorClosePulse: (id: string) => void;
  mccbBmsShuntOpen: (id: string) => void;
  moveComponent: (id: string, x: number, y: number) => void;
  rotateComponent: (id: string) => void;
  duplicateComponent: (id: string) => void;

  addWire: (wire: Omit<Wire, 'id'>) => void;
  updateWire: (id: string, updates: Partial<Wire>) => void;
  removeWire: (id: string) => void;
  startWire: (componentId: string, pointId: string) => void;
  addWirePoint: (x: number, y: number) => void;
  finishWire: (componentId: string, pointId: string) => void;
  cancelWire: () => void;

  setSelected: (id: string | null) => void;
  setTool: (tool: ToolMode) => void;
  setZoom: (zoom: number) => void;
  /** Zoom to `zoom` while keeping the world point under (stageX, stageY) fixed; coords match Konva `getPointerPosition()`. */
  setZoomAroundStagePoint: (
    zoom: number,
    stageX: number,
    stageY: number
  ) => void;
  setPan: (x: number, y: number) => void;

  runSimulation: () => void;
  clearCircuit: () => void;
  loadCircuit: (circuit: Circuit) => void;
  saveCircuit: () => void;

  undo: () => void;
  redo: () => void;
  pushHistory: (description: string) => void;

  dismissFault: () => void;

  setPhaseImbalanceWarningPercent: (percent: number) => void;
}

export const useCircuitStore = create<CircuitStore>((set, get) => ({
  circuit: createEmptyCircuit(),
  simulationResult: null,
  selectedId: null,
  tool: 'select',
  wireInProgress: null,
  wirePoints: [],
  wireOrientation: 'h',
  history: [],
  historyIndex: -1,
  faultDialogEvent: null,

  addComponent: (type, x, y, options) => {
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

  setMcbPoleLayout: (id, poles) => {
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
    const newCps = createConnectionPoints(comp.id, 'mcb', {
      mcbPoles: clamped,
    });
    const pairs: [string, string][] =
      prevLayout === 1 && clamped === 2
        ? [
            ['IN', 'IN_L'],
            ['OUT', 'OUT_L'],
          ]
        : [
            ['IN_L', 'IN'],
            ['OUT_L', 'OUT'],
            ['IN_N', 'IN'],
            ['OUT_N', 'OUT'],
          ];
    const remap = buildPointRemapByLabels(comp, newCps, pairs);
    const newWires = remapWireEndpointsForMorph(
      circuit.wires,
      comp.id,
      remap
    );
    const newComp: CircuitComponent = {
      ...comp,
      properties: { ...comp.properties, poles: clamped },
      connectionPoints: newCps,
    };
    const updatedCircuit = syncWireEndpoints({
      ...circuit,
      components: circuit.components.map((c) =>
        c.id === id ? newComp : c
      ),
      wires: newWires,
      updatedAt: new Date().toISOString(),
    });
    set({ circuit: updatedCircuit });
    get().pushHistory(`MCB ${clamped}P layout`);
    get().runSimulation();
  },

  setPushButtonPressed: (id, pressed) => {
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

  updateComponent: (id, updates) => {
    const next: Partial<CircuitComponent> =
      updates.scale !== undefined
        ? { ...updates, scale: clampComponentScale(updates.scale) }
        : updates;
    set((state) => ({
      // Re-snap wire endpoints to terminal world positions in case the update
      // changed something that moves them (e.g. visual scale). syncWireEndpoints
      // is idempotent, so it's safe to call on every property change.
      circuit: syncWireEndpoints({
        ...state.circuit,
        components: state.circuit.components.map((c) =>
          c.id === id ? { ...c, ...next } : c
        ),
        updatedAt: new Date().toISOString(),
      }),
    }));
    get().runSimulation();
  },

  setComponentPhaseSystem: (id, phase) => {
    const circuit = get().circuit;
    const comp = circuit.components.find((c) => c.id === id);
    if (!comp) return;
    const nextType = resolveTypeFromPhasePreference(comp.type, phase);
    if (nextType === comp.type) {
      get().updateComponent(id, {
        properties: { ...comp.properties, phaseSystem: phase },
      });
      get().pushHistory(`Phase system: ${phase}`);
      return;
    }
    const newProps = mergedPropsMorph(comp, nextType);
    const mcbPolesForCp =
      nextType === 'mcb'
        ? newProps.poles === 2
          ? 2
          : 1
        : undefined;
    const newCps = createConnectionPoints(comp.id, nextType, {
      mcbPoles: mcbPolesForCp,
    });
    const pairs = morphLabelPairs(comp, nextType);
    if (!pairs) {
      get().updateComponent(id, {
        properties: { ...comp.properties, phaseSystem: phase },
      });
      get().pushHistory(`Phase system: ${phase}`);
      return;
    }
    const remap = buildPointRemapByLabels(comp, newCps, pairs);
    const newComp: CircuitComponent = {
      id: comp.id,
      type: nextType,
      label: comp.label,
      x: comp.x,
      y: comp.y,
      rotation: comp.rotation,
      state: comp.state,
      selected: comp.selected,
      connectionPoints: newCps,
      properties: newProps,
    };
    const newWires = remapWireEndpointsForMorph(
      circuit.wires,
      comp.id,
      remap
    );
    const updatedCircuit = syncWireEndpoints({
      ...circuit,
      components: circuit.components.map((c) =>
        c.id === id ? newComp : c
      ),
      wires: newWires,
      updatedAt: new Date().toISOString(),
    });
    set({ circuit: updatedCircuit });
    get().pushHistory(`Phase ${phase}: ${comp.type} → ${nextType}`);
    get().runSimulation();
  },

  toggleComponent: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (!comp) return;
    const toggleable = [
      'switch',
      'mcb',
      'hrc_fuse',
      'control_circuit_fuse',
      'earth_leakage_relay_cbct',
      'rcd',
      'residual_current_circuit_breaker',
      'three_phase_mcb',
      'mccb',
      'motor_protection_circuit_breaker',
      'four_phase_mcb',
      'motorized_mccb',
      'four_pole_motorized_mccb',
      'air_circuit_breaker',
      // E-Stop: click latches the mushroom head pressed (loop opens). Reset
      // (twist-to-release) is exposed in the Properties panel for safety, but
      // a direct toggle from the canvas is also allowed for quick simulation.
      'estop',
      'door_interlock',
      'mechanical_interlock',
      'key_interlock',
      'aux_contact_block',
    ];
    if (toggleable.includes(comp.type) && comp.state !== 'tripped') {
      if (
        comp.type === 'aux_contact_block' &&
        comp.properties.auxContactFollowContactorId?.trim()
      ) {
        return;
      }
      const newState = comp.state === 'on' ? 'off' : 'on';
      get().updateComponent(id, { state: newState });
      get().pushHistory(`Toggled ${comp.label}`);
    }
  },

  resetTripped: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    const nextState =
      comp?.type === 'three_phase_motor' ? 'on' : 'off';
    const updates: Partial<CircuitComponent> = {
      state: nextState,
    };
    if (comp?.type === 'air_circuit_breaker') {
      updates.acbSimState = undefined;
    }
    get().updateComponent(id, updates);
    get().pushHistory('Reset protection / fault');
  },

  acbBmsClosePulse: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (!comp || comp.type !== 'air_circuit_breaker') return;
    const p = comp.properties;
    if (!p.acbBmsEnabled) return;
    if (p.acbBmsUvrEnergized === false) return;
    if (p.acbBmsSpringCharged === false) return;
    if (comp.state === 'tripped' || comp.state === 'fault') return;
    get().updateComponent(id, { state: 'on' });
    get().pushHistory('BMS ACB closing coil (CC pulse)');
  },

  acbBmsShuntOpen: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (!comp || comp.type !== 'air_circuit_breaker') return;
    if (!comp.properties.acbBmsEnabled) return;
    if (comp.state !== 'on') return;
    get().updateComponent(id, { state: 'off' });
    get().pushHistory('BMS ACB shunt trip (remote open)');
  },

  mccbBmsMotorClosePulse: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (
      !comp ||
      (comp.type !== 'motorized_mccb' &&
        comp.type !== 'four_pole_motorized_mccb')
    ) {
      return;
    }
    const p = comp.properties;
    if (!p.mccbBmsEnabled) return;
    if (p.mccbBmsCtrlVoltageOk === false) return;
    if (p.mccbBmsMotorReady === false) return;
    if (comp.state === 'tripped' || comp.state === 'fault') return;
    get().updateComponent(id, { state: 'on' });
    get().pushHistory('BMS mMCCB motor close (remote ON)');
  },

  mccbBmsShuntOpen: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (
      !comp ||
      (comp.type !== 'motorized_mccb' &&
        comp.type !== 'four_pole_motorized_mccb')
    ) {
      return;
    }
    if (!comp.properties.mccbBmsEnabled) return;
    if (comp.state !== 'on') return;
    get().updateComponent(id, { state: 'off' });
    get().pushHistory('BMS mMCCB shunt trip (remote OFF)');
  },

  removeComponent: (id) => {
    set((state) => ({
      circuit: {
        ...state.circuit,
        components: state.circuit.components.filter((c) => c.id !== id),
        wires: state.circuit.wires.filter(
          (w) =>
            w.fromComponentId !== id && w.toComponentId !== id
        ),
        updatedAt: new Date().toISOString(),
      },
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
    get().pushHistory('Removed component');
    get().runSimulation();
  },

  moveComponent: (id, x, y) => {
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
        const touches =
          w.fromComponentId === id || w.toComponentId === id;
        if (!touches || w.points.length <= 4) return w;
        const pts = [...w.points];
        for (let i = 2; i < pts.length - 2; i += 2) {
          pts[i] += dx;
          pts[i + 1] += dy;
        }
        return { ...w, points: pts };
      });
    }

    set({
      circuit: syncWireEndpoints({
        ...circuit,
        components: circuit.components.map((c) =>
          c.id === id ? { ...c, x: snappedX, y: snappedY } : c
        ),
        wires,
      }),
    });
  },

  rotateComponent: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (!comp) return;
    const nextRot = (comp.rotation + 90) % 360;
    set((state) => ({
      circuit: syncWireEndpoints({
        ...state.circuit,
        components: state.circuit.components.map((c) =>
          c.id === id ? { ...c, rotation: nextRot } : c
        ),
        updatedAt: new Date().toISOString(),
      }),
    }));
    get().pushHistory(`Rotated ${comp.label}`);
    get().runSimulation();
  },

  duplicateComponent: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (!comp) return;
    const baseScale = { initialScale: comp.scale ?? 1 };
    get().addComponent(
      comp.type,
      comp.x + 60,
      comp.y + 60,
      comp.type === 'push_button'
        ? {
            pushButtonVariant:
              comp.properties.buttonType === 'NC' ? 'NC' : 'NO',
            ...baseScale,
          }
        : comp.type === 'mcb'
          ? {
              mcbInitialPoles: mcbLayoutPoles(comp),
              ...baseScale,
            }
          : baseScale
    );
  },

  addWire: (wire) => {
    set((state) => ({
      circuit: {
        ...state.circuit,
        wires: [...state.circuit.wires, { ...wire, id: uuid() }],
        updatedAt: new Date().toISOString(),
      },
    }));
    get().pushHistory('Added wire');
    get().runSimulation();
  },

  updateWire: (id, updates) => {
    set((state) => ({
      circuit: {
        ...state.circuit,
        wires: state.circuit.wires.map((w) =>
          w.id === id ? { ...w, ...updates } : w
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().pushHistory('Updated wire');
    get().runSimulation();
  },

  removeWire: (id) => {
    set((state) => ({
      circuit: {
        ...state.circuit,
        wires: state.circuit.wires.filter((w) => w.id !== id),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().pushHistory('Removed wire');
    get().runSimulation();
  },

  startWire: (componentId, pointId) => {
    const comp = get().circuit.components.find(
      (c) => c.id === componentId
    );
    if (!comp) return;
    const point = comp.connectionPoints.find((p) => p.id === pointId);
    if (!point) return;
    const { x: absX, y: absY } = connectionPointWorld(comp, point);
    set({
      wireInProgress: {
        fromComponentId: componentId,
        fromPointId: pointId,
        color: inferWireColorFromSingleTerminal(point.label),
        crossSection: 2.5,
        energized: false,
        currentAmps: 0,
      },
      wirePoints: [absX, absY],
      wireOrientation: terminalOutwardOrientation(comp, point),
    });
  },

  addWirePoint: (x, y) => {
    set((state) => {
      const pts = state.wirePoints;
      if (pts.length < 2) {
        return { wirePoints: [...pts, x, y] };
      }
      const lastX = pts[pts.length - 2];
      const lastY = pts[pts.length - 1];
      const orientation = state.wireOrientation;
      // Each click commits a single turning point at the cursor along the
      // current orientation axis. The free coordinate follows the cursor
      // exactly (no grid snap, so the wire can stay aligned with off-grid
      // terminals); the constrained coordinate is locked to the previous
      // vertex so the segment between them is purely horizontal or vertical.
      const newX = orientation === 'h' ? x : lastX;
      const newY = orientation === 'h' ? lastY : y;
      if (newX === lastX && newY === lastY) {
        return state;
      }
      return {
        wirePoints: [...pts, newX, newY],
        wireOrientation: orientation === 'h' ? 'v' : 'h',
      };
    });
  },

  finishWire: (componentId, pointId) => {
    const wip = get().wireInProgress;
    if (!wip || !wip.fromComponentId || !wip.fromPointId) return;
    if (wip.fromComponentId === componentId && wip.fromPointId === pointId) {
      return;
    }

    const comp = get().circuit.components.find(
      (c) => c.id === componentId
    );
    if (!comp) return;
    const point = comp.connectionPoints.find((p) => p.id === pointId);
    if (!point) return;
    const fromComp = get().circuit.components.find(
      (c) => c.id === wip.fromComponentId
    );
    const fromPoint = fromComp?.connectionPoints.find(
      (p) => p.id === wip.fromPointId
    );

    const { x: absX, y: absY } = connectionPointWorld(comp, point);
    const pts = get().wirePoints;
    let allPoints: number[];
    if (pts.length >= 2) {
      const lastX = pts[pts.length - 2];
      const lastY = pts[pts.length - 1];
      // The destination terminal's outward axis dictates the *last* leg, so
      // the wire enters perpendicular to the component edge. Pick the corner
      // that produces that final orientation regardless of the running axis.
      const targetOrientation = terminalOutwardOrientation(comp, point);
      const firstAxis: 'h' | 'v' =
        targetOrientation === 'h' ? 'v' : 'h';
      const tail = orthogonalLeg(lastX, lastY, absX, absY, firstAxis);
      allPoints = [...pts, ...tail];
    } else {
      allPoints = [...pts, absX, absY];
    }

    const existing = get().circuit.wires;
    const duplicate = existing.some(
      (w) =>
        (w.fromComponentId === wip.fromComponentId &&
          w.fromPointId === wip.fromPointId &&
          w.toComponentId === componentId &&
          w.toPointId === pointId) ||
        (w.fromComponentId === componentId &&
          w.fromPointId === pointId &&
          w.toComponentId === wip.fromComponentId &&
          w.toPointId === wip.fromPointId)
    );
    if (duplicate) return;

    get().addWire({
      fromComponentId: wip.fromComponentId,
      fromPointId: wip.fromPointId,
      toComponentId: componentId,
      toPointId: pointId,
      points: allPoints,
      ...inferWireMetadata(fromPoint?.label || '', point.label),
      crossSection: wip.crossSection || 2.5,
      energized: false,
      currentAmps: 0,
    });

    set({ wireInProgress: null, wirePoints: [], wireOrientation: 'h' });
  },

  cancelWire: () => {
    set({ wireInProgress: null, wirePoints: [], wireOrientation: 'h' });
  },

  setSelected: (id) =>
    set((state) => ({
      selectedId: id,
      circuit: {
        ...state.circuit,
        components: state.circuit.components.map((c) => ({
          ...c,
          selected: id !== null && c.id === id,
        })),
      },
    })),
  setTool: (tool) => {
    set({ tool });
    if (tool !== 'wire') {
      get().cancelWire();
    }
  },
  setZoom: (zoom) =>
    set((state) => ({
      circuit: {
        ...state.circuit,
        zoom: Math.max(0.1, Math.min(5, zoom)),
      },
    })),
  setZoomAroundStagePoint: (zoom, stageX, stageY) =>
    set((state) => {
      const prevZ = state.circuit.zoom;
      const z = Math.max(0.1, Math.min(5, zoom));
      if (Math.abs(z - prevZ) < 1e-12) {
        return state;
      }
      const ratio = z / prevZ;
      const panX = stageX - (stageX - state.circuit.panX) * ratio;
      const panY = stageY - (stageY - state.circuit.panY) * ratio;
      return {
        circuit: {
          ...state.circuit,
          zoom: z,
          panX,
          panY,
        },
      };
    }),
  setPan: (x, y) =>
    set((state) => ({
      circuit: { ...state.circuit, panX: x, panY: y },
    })),

  runSimulation: () => {
    const base = get().circuit;
    const normalized = {
      ...base,
      components: base.components.map(ensureBreakerControlTerminals),
    };
    const clonedCircuit = structuredClone(normalized);
    const result = engine.simulate(clonedCircuit, 0, Date.now());
    set({
      circuit: clonedCircuit,
      simulationResult: result,
      faultDialogEvent:
        result.faults.length > 0 ? result.faults[0] : null,
    });
  },

  clearCircuit: () => {
    set({
      circuit: createEmptyCircuit(),
      simulationResult: null,
      selectedId: null,
      history: [],
      historyIndex: -1,
    });
  },

  loadCircuit: (circuit) => {
    let wires = circuit.wires;
    const withPush = circuit.components.map((c) =>
      c.type === 'push_button' && !('pressed' in c)
        ? { ...c, pressed: false }
        : c
    );
    const components = withPush.map((c) => {
      if (c.type !== 'mcb') return c;
      if ((c.properties.poles ?? 1) !== 2) return c;
      if (c.connectionPoints.some((p) => labelNorm(p.label) === 'IN_L')) {
        return c;
      }
      const newCps = createConnectionPoints(c.id, 'mcb', { mcbPoles: 2 });
      const remap = buildPointRemapByLabels(c, newCps, [
        ['IN', 'IN_L'],
        ['OUT', 'OUT_L'],
      ]);
      wires = remapWireEndpointsForMorph(wires, c.id, remap);
      return { ...c, connectionPoints: newCps };
    });
    const withAcbCps = components.map((c) =>
      ensureBreakerControlTerminals(c)
    );
    const normalized: Circuit = {
      ...circuit,
      components: withAcbCps,
      wires,
    };
    set({ circuit: normalized, selectedId: null });
    get().runSimulation();
  },

  saveCircuit: () => {
    const c = get().circuit;
    const data = {
      version: '1.0',
      name: c.name,
      created: c.createdAt,
      circuit: {
        components: c.components,
        wires: c.wires,
        phaseImbalanceWarningPercent: c.phaseImbalanceWarningPercent ?? 15,
      },
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${get().circuit.name}.esim`;
    a.click();
    URL.revokeObjectURL(url);
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    set({
      circuit: JSON.parse(
        JSON.stringify(history[newIndex].circuit)
      ),
      historyIndex: newIndex,
    });
    get().runSimulation();
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    set({
      circuit: JSON.parse(
        JSON.stringify(history[newIndex].circuit)
      ),
      historyIndex: newIndex,
    });
    get().runSimulation();
  },

  pushHistory: (description) => {
    const circuit = JSON.parse(JSON.stringify(get().circuit));
    set((state) => {
      const trimmed = state.history.slice(
        0,
        state.historyIndex + 1
      );
      const newHistory = [
        ...trimmed,
        { circuit, description },
      ].slice(-50);
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  dismissFault: () => set({ faultDialogEvent: null }),

  setPhaseImbalanceWarningPercent: (percent) => {
    const p = Math.min(100, Math.max(0, Number(percent) || 15));
    set((state) => ({
      circuit: {
        ...state.circuit,
        phaseImbalanceWarningPercent: p,
        updatedAt: new Date().toISOString(),
      },
    }));
  },
}));
