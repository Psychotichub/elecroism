import { create } from 'zustand';
import type {
  Circuit,
  CircuitComponent,
  Wire,
  SimulationResult,
  ToolMode,
  HistoryEntry,
  ConnectionPoint,
  ComponentType,
  ComponentProperties,
  FaultEvent,
} from '../types';
import { engine } from '../simulation/engine';
import { v4 as uuid } from 'uuid';
import { rotatePoint } from '../utils/geometry';

function inferWireColor(
  fromLabel: string,
  toLabel: string
): Wire['color'] {
  const tokenize = (label: string): string[] =>
    label
      .toUpperCase()
      .split(/[^A-Z0-9]+/)
      .filter(Boolean);

  const tokens = [...tokenize(fromLabel), ...tokenize(toLabel)];
  const hasToken = (token: string) => tokens.includes(token);

  if (hasToken('PE') || hasToken('EARTH') || hasToken('GROUND')) {
    return 'green_yellow';
  }

  if (hasToken('N') || hasToken('NEUTRAL')) {
    return 'blue';
  }

  if (hasToken('L1') || hasToken('PHASE1')) {
    return 'brown';
  }
  if (hasToken('L2') || hasToken('PHASE2')) {
    return 'black';
  }
  if (hasToken('L3') || hasToken('PHASE3')) {
    return 'grey';
  }

  if (hasToken('L') || hasToken('PHASE') || hasToken('LINE')) {
    return 'brown';
  }

  return 'brown';
}

function getConnectionPointAbsolutePosition(
  circuit: Circuit,
  componentId: string,
  pointId: string
): { x: number; y: number } | null {
  const comp = circuit.components.find((c) => c.id === componentId);
  if (!comp) return null;
  const point = comp.connectionPoints.find((p) => p.id === pointId);
  if (!point) return null;
  const rotated = rotatePoint(point.x, point.y, comp.rotation);
  return { x: comp.x + rotated.x, y: comp.y + rotated.y };
}

function syncWireEndpoints(circuit: Circuit): Circuit {
  return {
    ...circuit,
    wires: circuit.wires.map((wire) => {
      const fromPos = getConnectionPointAbsolutePosition(
        circuit,
        wire.fromComponentId,
        wire.fromPointId
      );
      const toPos = getConnectionPointAbsolutePosition(
        circuit,
        wire.toComponentId,
        wire.toPointId
      );

      if (!fromPos || !toPos) return wire;

      const points =
        wire.points.length >= 4
          ? [...wire.points]
          : [fromPos.x, fromPos.y, toPos.x, toPos.y];

      points[0] = fromPos.x;
      points[1] = fromPos.y;
      points[points.length - 2] = toPos.x;
      points[points.length - 1] = toPos.y;

      return { ...wire, points };
    }),
  };
}

function createConnectionPoints(
  componentId: string,
  type: ComponentType
): ConnectionPoint[] {
  switch (type) {
    case 'power_source':
      return [
        { id: uuid(), componentId, x: 0, y: 30, label: 'L_OUT' },
        { id: uuid(), componentId, x: -15, y: 30, label: 'N_OUT' },
      ];
    case 'three_phase_source':
      return [
        { id: uuid(), componentId, x: -20, y: -32, label: 'L1_OUT' },
        { id: uuid(), componentId, x: 0, y: -32, label: 'L2_OUT' },
        { id: uuid(), componentId, x: 20, y: -32, label: 'L3_OUT' },
        { id: uuid(), componentId, x: 0, y: 32, label: 'N_OUT' },
      ];
    case 'three_phase_motor':
      return [
        { id: uuid(), componentId, x: -20, y: -22, label: 'L1' },
        { id: uuid(), componentId, x: 0, y: -22, label: 'L2' },
        { id: uuid(), componentId, x: 20, y: -22, label: 'L3' },
        { id: uuid(), componentId, x: 0, y: 22, label: 'N' },
      ];
    case 'three_phase_mcb':
      return [
        { id: uuid(), componentId, x: -20, y: -25, label: 'IN_L1' },
        { id: uuid(), componentId, x: -20, y: 25, label: 'OUT_L1' },
        { id: uuid(), componentId, x: 0, y: -25, label: 'IN_L2' },
        { id: uuid(), componentId, x: 0, y: 25, label: 'OUT_L2' },
        { id: uuid(), componentId, x: 20, y: -25, label: 'IN_L3' },
        { id: uuid(), componentId, x: 20, y: 25, label: 'OUT_L3' },
      ];
    case 'four_phase_mcb':
      return [
        { id: uuid(), componentId, x: -30, y: -25, label: 'IN_L1' },
        { id: uuid(), componentId, x: -30, y: 25, label: 'OUT_L1' },
        { id: uuid(), componentId, x: -10, y: -25, label: 'IN_L2' },
        { id: uuid(), componentId, x: -10, y: 25, label: 'OUT_L2' },
        { id: uuid(), componentId, x: 10, y: -25, label: 'IN_L3' },
        { id: uuid(), componentId, x: 10, y: 25, label: 'OUT_L3' },
        { id: uuid(), componentId, x: 30, y: -25, label: 'IN_N' },
        { id: uuid(), componentId, x: 30, y: 25, label: 'OUT_N' },
      ];
    case 'switch':
    case 'push_button':
      return [
        { id: uuid(), componentId, x: 0, y: -20, label: 'IN' },
        { id: uuid(), componentId, x: 0, y: 20, label: 'OUT' },
      ];
    case 'mcb':
    case 'rcd':
    case 'overload_relay':
      return [
        { id: uuid(), componentId, x: 0, y: -25, label: 'IN' },
        { id: uuid(), componentId, x: 0, y: 25, label: 'OUT' },
      ];
    case 'socket':
      return [
        { id: uuid(), componentId, x: -10, y: -20, label: 'L' },
        { id: uuid(), componentId, x: 10, y: -20, label: 'N' },
        { id: uuid(), componentId, x: 0, y: 20, label: 'PE' },
      ];
    case 'lamp':
    case 'motor':
    case 'heater':
    case 'generic_load':
      return [
        { id: uuid(), componentId, x: 0, y: -20, label: 'T1' },
        { id: uuid(), componentId, x: 0, y: 20, label: 'T2' },
      ];
    case 'busbar':
      return Array.from({ length: 6 }, (_, i) => ({
        id: uuid(),
        componentId,
        x: -50 + i * 20,
        y: 0,
        label: `TAP_${i + 1}`,
      }));
    case 'junction':
      return [
        { id: uuid(), componentId, x: 0, y: -8, label: 'T1' },
        { id: uuid(), componentId, x: 8, y: 0, label: 'T2' },
        { id: uuid(), componentId, x: 0, y: 8, label: 'T3' },
        { id: uuid(), componentId, x: -8, y: 0, label: 'T4' },
      ];
    case 'contactor':
    case 'relay':
    case 'timer':
      return [
        { id: uuid(), componentId, x: 0, y: -25, label: 'IN' },
        { id: uuid(), componentId, x: 0, y: 25, label: 'OUT' },
        { id: uuid(), componentId, x: -20, y: 0, label: 'A1' },
        { id: uuid(), componentId, x: 20, y: 0, label: 'A2' },
      ];
    case 'three_phase_contactor':
      return [
        { id: uuid(), componentId, x: -20, y: -25, label: 'IN_L1' },
        { id: uuid(), componentId, x: -20, y: 25, label: 'OUT_L1' },
        { id: uuid(), componentId, x: 0, y: -25, label: 'IN_L2' },
        { id: uuid(), componentId, x: 0, y: 25, label: 'OUT_L2' },
        { id: uuid(), componentId, x: 20, y: -25, label: 'IN_L3' },
        { id: uuid(), componentId, x: 20, y: 25, label: 'OUT_L3' },
        { id: uuid(), componentId, x: -36, y: 0, label: 'A1' },
        { id: uuid(), componentId, x: 36, y: 0, label: 'A2' },
      ];
    case 'four_phase_contactor':
      return [
        { id: uuid(), componentId, x: -30, y: -25, label: 'IN_L1' },
        { id: uuid(), componentId, x: -30, y: 25, label: 'OUT_L1' },
        { id: uuid(), componentId, x: -10, y: -25, label: 'IN_L2' },
        { id: uuid(), componentId, x: -10, y: 25, label: 'OUT_L2' },
        { id: uuid(), componentId, x: 10, y: -25, label: 'IN_L3' },
        { id: uuid(), componentId, x: 10, y: 25, label: 'OUT_L3' },
        { id: uuid(), componentId, x: 30, y: -25, label: 'IN_N' },
        { id: uuid(), componentId, x: 30, y: 25, label: 'OUT_N' },
        { id: uuid(), componentId, x: -44, y: 0, label: 'A1' },
        { id: uuid(), componentId, x: 44, y: 0, label: 'A2' },
      ];
    default:
      return [
        { id: uuid(), componentId, x: 0, y: -20, label: 'IN' },
        { id: uuid(), componentId, x: 0, y: 20, label: 'OUT' },
      ];
  }
}

function getDefaultProperties(type: ComponentType): ComponentProperties {
  switch (type) {
    case 'power_source':
      return { voltage: 230, phaseSystem: 'single_phase' };
    case 'three_phase_source':
      return {
        phaseSystem: 'three_phase',
        lineVoltage: 400,
        phaseVoltage: 400 / Math.sqrt(3),
        voltage: 400,
      };
    case 'three_phase_motor':
      return {
        powerWatts: 3000,
        loadType: 'inductive',
        powerFactor: 0.85,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
        ratedLineAmps: 5.5,
      };
    case 'three_phase_mcb':
      return {
        ratingAmps: 16,
        tripCurve: 'C',
        breakingCapacity: 6000,
        poles: 3,
        lineVoltage: 400,
      };
    case 'four_phase_mcb':
      return {
        ratingAmps: 16,
        tripCurve: 'C',
        breakingCapacity: 6000,
        poles: 4,
        lineVoltage: 400,
      };
    case 'three_phase_contactor':
      return {
        ratingAmps: 25,
        poles: 3,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
      };
    case 'four_phase_contactor':
      return {
        ratingAmps: 25,
        poles: 4,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
      };
    case 'switch':
      return { switchType: 'SPST', poles: 1 };
    case 'push_button':
      return { buttonType: 'NO' };
    case 'mcb':
      return {
        ratingAmps: 16,
        tripCurve: 'C',
        breakingCapacity: 6000,
        poles: 1,
      };
    case 'rcd':
      return { ratingAmps: 40, rcdSensitivity: 30, poles: 2 };
    case 'overload_relay':
      return { ratingAmps: 16 };
    case 'socket':
      return { socketType: 'schuko', voltage: 230, ratingAmps: 16 };
    case 'lamp':
      return { powerWatts: 60, loadType: 'resistive', powerFactor: 1 };
    case 'motor':
      return {
        powerWatts: 1000,
        loadType: 'inductive',
        powerFactor: 0.8,
      };
    case 'heater':
      return {
        powerWatts: 2000,
        loadType: 'resistive',
        powerFactor: 1,
      };
    case 'generic_load':
      return {
        powerWatts: 100,
        loadType: 'resistive',
        powerFactor: 1,
      };
    case 'busbar':
      return { wireColor: 'brown' };
    case 'contactor':
    case 'relay':
    case 'timer':
      return { ratingAmps: 25 };
    default:
      return {};
  }
}

function getDefaultLabel(type: ComponentType): string {
  const labels: Record<string, string> = {
    power_source: 'AC Supply',
    switch: 'Switch',
    push_button: 'PB',
    mcb: 'MCB',
    rcd: 'RCD',
    overload_relay: 'OLR',
    socket: 'Socket',
    lamp: 'Lamp',
    motor: 'Motor',
    heater: 'Heater',
    generic_load: 'Load',
    busbar: 'Busbar',
    junction: 'Junction',
    contactor: 'Contactor',
    relay: 'Relay',
    timer: 'Timer',
    three_phase_source: '3φ Supply',
    three_phase_motor: '3φ Motor',
    three_phase_mcb: '3P MCB',
    four_phase_mcb: '4P MCB',
    three_phase_contactor: '3P KM',
    four_phase_contactor: '4P KM',
  };
  return labels[type] || type;
}

function getInitialState(type: ComponentType): CircuitComponent['state'] {
  // Components that represent user-operated switching/protection start open/off.
  const startsOff = new Set<ComponentType>([
    'switch',
    'push_button',
    'mcb',
    'rcd',
    'contactor',
    'relay',
    'timer',
    'overload_relay',
    'three_phase_mcb',
    'four_phase_mcb',
    'three_phase_contactor',
    'four_phase_contactor',
  ]);

  if (type === 'push_button') return 'off';
  return startsOff.has(type) ? 'off' : 'on';
}

function createEmptyCircuit(): Circuit {
  return {
    id: uuid(),
    name: 'New Circuit',
    components: [],
    wires: [],
    gridSize: 20,
    zoom: 1,
    panX: 0,
    panY: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

interface CircuitStore {
  circuit: Circuit;
  simulationResult: SimulationResult | null;
  selectedId: string | null;
  tool: ToolMode;
  wireInProgress: Partial<Wire> | null;
  wirePoints: number[];
  history: HistoryEntry[];
  historyIndex: number;
  faultDialogEvent: FaultEvent | null;

  addComponent: (
    type: ComponentType,
    x: number,
    y: number,
    options?: { pushButtonVariant?: 'NO' | 'NC' }
  ) => void;
  setPushButtonPressed: (id: string, pressed: boolean) => void;
  updateComponent: (
    id: string,
    updates: Partial<CircuitComponent>
  ) => void;
  removeComponent: (id: string) => void;
  toggleComponent: (id: string) => void;
  resetTripped: (id: string) => void;
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
  setPan: (x: number, y: number) => void;

  runSimulation: () => void;
  clearCircuit: () => void;
  loadCircuit: (circuit: Circuit) => void;
  saveCircuit: () => void;

  undo: () => void;
  redo: () => void;
  pushHistory: (description: string) => void;

  dismissFault: () => void;
}

export const useCircuitStore = create<CircuitStore>((set, get) => ({
  circuit: createEmptyCircuit(),
  simulationResult: null,
  selectedId: null,
  tool: 'select',
  wireInProgress: null,
  wirePoints: [],
  history: [],
  historyIndex: -1,
  faultDialogEvent: null,

  addComponent: (type, x, y) => {
    const id = uuid();
    const newComp: CircuitComponent = {
      id,
      type,
      label: getDefaultLabel(type),
      x,
      y,
      rotation: 0,
      state: getInitialState(type),
      selected: false,
      connectionPoints: createConnectionPoints(id, type),
      properties: getDefaultProperties(type),
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
    set((state) => ({
      circuit: {
        ...state.circuit,
        components: state.circuit.components.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().runSimulation();
  },

  toggleComponent: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (!comp) return;
    const toggleable = [
      'switch',
      'mcb',
      'rcd',
      'three_phase_mcb',
      'four_phase_mcb',
    ];
    if (toggleable.includes(comp.type) && comp.state !== 'tripped') {
      const newState = comp.state === 'on' ? 'off' : 'on';
      get().updateComponent(id, { state: newState });
      get().pushHistory(`Toggled ${comp.label}`);
    }
  },

  resetTripped: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    const nextState =
      comp?.type === 'three_phase_motor' ? 'on' : 'off';
    get().updateComponent(id, { state: nextState });
    get().pushHistory('Reset protection / fault');
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
    set((state) => ({
      circuit: syncWireEndpoints({
        ...state.circuit,
        components: state.circuit.components.map((c) =>
          c.id === id ? { ...c, x: snappedX, y: snappedY } : c
        ),
      }),
    }));
  },

  rotateComponent: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (!comp) return;
    get().updateComponent(id, {
      rotation: (comp.rotation + 90) % 360,
    });
    get().pushHistory(`Rotated ${comp.label}`);
  },

  duplicateComponent: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (!comp) return;
    get().addComponent(
      comp.type,
      comp.x + 60,
      comp.y + 60,
      comp.type === 'push_button'
        ? {
            pushButtonVariant:
              comp.properties.buttonType === 'NC' ? 'NC' : 'NO',
          }
        : undefined
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
    const rotated = rotatePoint(point.x, point.y, comp.rotation);
    const absX = comp.x + rotated.x;
    const absY = comp.y + rotated.y;
    set({
      wireInProgress: {
        fromComponentId: componentId,
        fromPointId: pointId,
        color: inferWireColor(point.label, point.label),
        crossSection: 2.5,
        energized: false,
        currentAmps: 0,
      },
      wirePoints: [absX, absY],
    });
  },

  addWirePoint: (x, y) => {
    const gridSize = get().circuit.gridSize;
    const snappedX = Math.round(x / gridSize) * gridSize;
    const snappedY = Math.round(y / gridSize) * gridSize;
    set((state) => ({
      wirePoints: [...state.wirePoints, snappedX, snappedY],
    }));
  },

  finishWire: (componentId, pointId) => {
    const wip = get().wireInProgress;
    if (!wip || !wip.fromComponentId || !wip.fromPointId) return;
    if (wip.fromComponentId === componentId) return;

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

    const rotated = rotatePoint(point.x, point.y, comp.rotation);
    const absX = comp.x + rotated.x;
    const absY = comp.y + rotated.y;
    const allPoints = [...get().wirePoints, absX, absY];

    get().addWire({
      fromComponentId: wip.fromComponentId,
      fromPointId: wip.fromPointId,
      toComponentId: componentId,
      toPointId: pointId,
      points: allPoints,
      color: inferWireColor(fromPoint?.label || '', point.label),
      crossSection: wip.crossSection || 2.5,
      energized: false,
      currentAmps: 0,
    });

    set({ wireInProgress: null, wirePoints: [] });
  },

  cancelWire: () => {
    set({ wireInProgress: null, wirePoints: [] });
  },

  setSelected: (id) => set({ selectedId: id }),
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
  setPan: (x, y) =>
    set((state) => ({
      circuit: { ...state.circuit, panX: x, panY: y },
    })),

  runSimulation: () => {
    const clonedCircuit = structuredClone(get().circuit);
    const result = engine.simulate(clonedCircuit);
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
    const normalized: Circuit = {
      ...circuit,
      components: circuit.components.map((c) =>
        c.type === 'push_button' && c.pressed === undefined
          ? { ...c, pressed: false }
          : c
      ),
    };
    set({ circuit: normalized, selectedId: null });
    get().runSimulation();
  },

  saveCircuit: () => {
    const data = {
      version: '1.0',
      name: get().circuit.name,
      created: get().circuit.createdAt,
      circuit: {
        components: get().circuit.components,
        wires: get().circuit.wires,
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
}));
