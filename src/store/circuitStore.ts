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
  BmsSimLogEntry,
  WireObjectSnapModes,
  WireColor,
  WireStyleLayer,
} from '../types';
import { DEFAULT_WIRE_OBJECT_SNAP_MODES } from '../types';
import { engine } from '../simulation/engine';
import { v4 as uuid } from 'uuid';
import {
  clampComponentScale,
  connectionPointWorld,
  orthogonalLeg,
  terminalOutwardOrientation,
} from '../utils/geometry';
import {
  buildWireObstacleRects,
  dedupeWirePoints,
  routeWireBetweenTerminals,
} from '../utils/wireAutoRoute';
import {
  finalizeWirePolylineForCommit,
  insertVertexOnWireSegment,
  removeInteriorWireVertex,
  translateWireSegment,
} from '../utils/wireGripUtils';
import {
  resolveSplitPointOnSegment,
  splitPolylineAtPoint,
  connectionPointIdByLabel,
  buildBranchPolylineToPoint,
  teeHitToleranceWorld,
  distanceSqToWireSegment,
} from '../utils/wireJunctionSplit';
import { checkWireConnection } from '../utils/wireConnectionRules';
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
import {
  removeCollinearInteriorVertices,
  trimWireBetweenVertexIndices,
  extendWireFromStartTowardHit,
  extendWireFromEndTowardHit,
  tryMergeWirePairAtJunction,
  hitTestClosestWireSegment,
} from '../utils/wireEditOps';
import { nextWireNumber } from '../utils/wireLabelLayout';
import {
  deriveEndpointWireNumber,
  refreshAutoWireNumbers,
} from '../utils/wireEndpointNumbering';
import { normalizeWirePoints } from '../utils/wireNormalize';
import { downloadWireScheduleCsv } from '../utils/wireScheduleExport';
import {
  applyWireStyleLayerDefaults,
  suggestedCrossSectionForLayer,
} from '../utils/wireStyleLayers';

const BMS_SIM_LOG_CAP = 80;

function appendBmsSimLog(
  set: (
    partial:
      | Partial<CircuitStore>
      | ((state: CircuitStore) => Partial<CircuitStore>)
  ) => void,
  entry: Omit<BmsSimLogEntry, 'id' | 'ts'>
) {
  set((state) => ({
    bmsSimLog: [
      { ...entry, id: uuid(), ts: Date.now() },
      ...state.bmsSimLog,
    ].slice(0, BMS_SIM_LOG_CAP),
  }));
}

/** Merge label-inferred stroke metadata with sticky wire-tool defaults. */
function resolvedWireStrokeForNewConnection(
  draft: {
    color: WireColor | null;
    wireCategory: 'power' | 'control' | 'comm' | null;
    styleLayer: WireStyleLayer | null;
  },
  fromLabel: string,
  toLabel: string
): Pick<Wire, 'color' | 'wireCategory' | 'wireProtocol'> & {
  styleLayer?: WireStyleLayer;
} {
  const inf = inferWireMetadata(fromLabel, toLabel);
  let color = draft.color ?? inf.color;
  let wireCategory = draft.wireCategory ?? inf.wireCategory;
  let wireProtocol: Wire['wireProtocol'] = inf.wireProtocol;

  if (draft.styleLayer) {
    const layerDefaults = applyWireStyleLayerDefaults(draft.styleLayer);
    if (draft.color === null) {
      color = layerDefaults.color;
    }
    if (draft.wireCategory === null) {
      wireCategory = layerDefaults.wireCategory;
    }
    wireProtocol = layerDefaults.wireProtocol;
  }

  if (draft.wireCategory !== null) {
    if (draft.wireCategory !== 'comm') {
      wireProtocol = 'none';
    } else if (inf.wireCategory !== 'comm') {
      wireProtocol = 'other';
    }
  }

  const out: Pick<Wire, 'color' | 'wireCategory' | 'wireProtocol'> & {
    styleLayer?: WireStyleLayer;
  } = { color, wireCategory, wireProtocol };
  if (draft.styleLayer) {
    out.styleLayer = draft.styleLayer;
  }
  return out;
}

interface CircuitStore {
  circuit: Circuit;
  simulationResult: SimulationResult | null;
  selectedId: string | null;
  /** Selected vertex on the selected wire (for Delete = remove bend). */
  wireGripVertexIndex: number | null;
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
  /** Last BMS command attempts (simulator / audit). */
  bmsSimLog: BmsSimLogEntry[];
  clearBmsSimLog: () => void;
  clearBmsSimLogForDevice: (deviceId: string) => void;

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
  /** Live polyline while dragging grips — no history/simulation. */
  setWirePointsLive: (wireId: string, points: number[]) => void;
  /** Finalize grip edit: endpoint reconnect/revert, grid snap, sync, history, sim. */
  commitWireGripEdit: (
    wireId: string,
    draggedVertexIndex: number | null
  ) => void;
  setWireGripVertexIndex: (index: number | null) => void;
  insertWireVertex: (
    wireId: string,
    segmentIndex: number,
    worldX: number,
    worldY: number
  ) => void;
  removeWireVertex: (wireId: string, vertexIndex: number) => void;
  moveWireSegment: (
    wireId: string,
    segmentIndex: number,
    deltaX: number,
    deltaY: number
  ) => void;
  /** Move one vertex to world (x,y) and commit (history + sync + sim). */
  moveWireVertex: (
    wireId: string,
    vertexIndex: number,
    x: number,
    y: number
  ) => void;
  startWire: (componentId: string, pointId: string) => void;
  addWirePoint: (x: number, y: number) => void;
  finishWire: (componentId: string, pointId: string) => void;
  /**
   * Complete the in-progress wire by tapping an existing wire segment (T junction):
   * split the span, insert a junction dot, and attach the branch.
   */
  finishWireOnWireSpan: (
    targetWireId: string,
    segmentIndex: number,
    worldX: number,
    worldY: number
  ) => void;
  cancelWire: () => void;
  /**
   * Remove last committed wire vertex while drawing (Backspace).
   * Keeps wire active if only the start point remains; flips `wireOrientation` back.
   */
  undoLastWirePoint: () => void;

  /** Object snap for wire tool (terminals, wire geometry). F3 / osnap. */
  wireObjectSnapEnabled: boolean;
  /** Grid snap while wiring (F9 / grid). */
  wireGridSnapEnabled: boolean;
  /** Orthogonal segments from last vertex (F8 / ortho). Off = free-angle segments. */
  wireOrthoEnabled: boolean;
  /** When on, terminal-to-terminal finish with no polyline uses auto Manhattan routing. */
  wireAutoRouteEnabled: boolean;
  toggleWireAutoRoute: () => void;
  setWireObjectSnapEnabled: (v: boolean) => void;
  setWireGridSnapEnabled: (v: boolean) => void;
  setWireOrthoEnabled: (v: boolean) => void;
  toggleWireObjectSnap: () => void;
  toggleWireGridSnap: () => void;
  toggleWireOrtho: () => void;
  /** Flip next wire leg axis without adding a vertex (Tab). */
  toggleWireOrientation: () => void;
  /** Per-mode object snap (connection / endpoint / midpoint / intersection). */
  wireSnapModes: WireObjectSnapModes;
  setWireSnapModes: (partial: Partial<WireObjectSnapModes>) => void;
  toggleWireSnapMode: (key: keyof WireObjectSnapModes) => void;
  resetWireSnapModes: () => void;

  /** Sticky stroke / category for the next wire (and live patch while drafting). */
  wireDraftDefaults: {
    color: WireColor | null;
    wireCategory: 'power' | 'control' | 'comm' | null;
    styleLayer: WireStyleLayer | null;
  };
  patchWireDraftStyle: (partial: {
    color?: WireColor | null;
    wireCategory?: 'power' | 'control' | 'comm' | null;
    styleLayer?: WireStyleLayer | null;
  }) => void;

  /** CAD-style wire edit: break = split at click; trim = two vertex grips; extend = click cutter segment. */
  wireCadEditMode: null | 'break' | 'trim' | 'extend';
  /** Which end to lengthen for `extend` (first or last bend toward a crossing). */
  wireCadExtendEnd: 'from' | 'to';
  wireTrimFirstVertexIndex: number | null;
  setWireCadEditMode: (mode: null | 'break' | 'trim' | 'extend') => void;
  setWireCadExtendEnd: (end: 'from' | 'to') => void;
  clearWireCadEditMode: () => void;
  setWireTrimFirstVertexIndex: (index: number | null) => void;

  breakWireAtSpan: (
    wireId: string,
    segmentIndex: number,
    worldX: number,
    worldY: number
  ) => string;
  simplifyWireCollinear: (wireId: string) => string;
  normalizeWireRoute: (wireId: string) => string;
  mergeWiresAtJunction: (junctionComponentId: string) => string;
  trimWireBetweenGrips: (
    wireId: string,
    vertexIndexA: number,
    vertexIndexB: number
  ) => string;
  extendWireToCutterHit: (cutterWireId: string, worldX: number, worldY: number) => string;

  setSelected: (
    id: string | null,
    options?: { clearWireGrip?: boolean }
  ) => void;
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
  /** Download a CSV wire schedule (numbers, endpoints, tags, style). */
  exportWireScheduleCsv: () => void;

  undo: () => void;
  redo: () => void;
  pushHistory: (description: string) => void;

  dismissFault: () => void;

  setPhaseImbalanceWarningPercent: (percent: number) => void;

  setCircuitWireLabelsVisible: (visible: boolean) => void;
}

export const useCircuitStore = create<CircuitStore>((set, get) => ({
  circuit: createEmptyCircuit(),
  simulationResult: null,
  selectedId: null,
  wireGripVertexIndex: null,
  tool: 'select',
  wireInProgress: null,
  wirePoints: [],
  wireOrientation: 'h',
  wireObjectSnapEnabled: true,
  wireGridSnapEnabled: false,
  wireOrthoEnabled: true,
  wireAutoRouteEnabled: true,
  wireSnapModes: { ...DEFAULT_WIRE_OBJECT_SNAP_MODES },
  wireDraftDefaults: { color: null, wireCategory: null, styleLayer: null },
  wireCadEditMode: null,
  wireCadExtendEnd: 'from',
  wireTrimFirstVertexIndex: null,
  history: [],
  historyIndex: -1,
  faultDialogEvent: null,
  bmsSimLog: [],

  clearBmsSimLog: () => set({ bmsSimLog: [] }),

  clearBmsSimLogForDevice: (deviceId) =>
    set((s) => ({
      bmsSimLog: s.bmsSimLog.filter((e) => e.deviceId !== deviceId),
    })),

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
            ['IN', '1'],
            ['OUT', '2'],
            ['1', '1'],
            ['2', '2'],
          ]
        : [
            ['IN_L', '1'],
            ['OUT_L', '2'],
            ['IN_N', '1'],
            ['OUT_N', '2'],
            ['1', '1'],
            ['2', '2'],
            ['3', '1'],
            ['4', '2'],
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
    const rcdPolesForCpMorph =
      nextType === 'rcd' || nextType === 'residual_current_circuit_breaker'
        ? (newProps.poles ?? 2) >= 4
          ? 4
          : 2
        : undefined;
    const newCps = createConnectionPoints(comp.id, nextType, {
      mcbPoles: mcbPolesForCp,
      rcdPoles: rcdPolesForCpMorph,
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
    const updatedCircuit = refreshAutoWireNumbers(
      syncWireEndpoints({
        ...circuit,
        components: circuit.components.map((c) =>
          c.id === id ? newComp : c
        ),
        wires: newWires,
        updatedAt: new Date().toISOString(),
      })
    );
    set({ circuit: updatedCircuit });
    get().pushHistory(`Phase ${phase}: ${comp.type} → ${nextType}`);
    get().runSimulation();
  },

  toggleComponent: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (!comp) return;
    const toggleable = [
      'switch',
      'two_way_switch',
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
    const base = {
      deviceId: id,
      label: comp.label,
      deviceKind: 'ACB' as const,
      command: 'ACB close (CC)',
    };
    if (!p.acbBmsEnabled) {
      appendBmsSimLog(set, {
        ...base,
        ok: false,
        detail: 'BMS is disabled on this breaker — enable BMS in properties.',
      });
      return;
    }
    if (p.acbBmsUvrEnergized === false) {
      appendBmsSimLog(set, {
        ...base,
        ok: false,
        detail: 'UVR not energized — closing coil interlock blocks close.',
      });
      return;
    }
    if (p.acbBmsSpringCharged === false) {
      appendBmsSimLog(set, {
        ...base,
        ok: false,
        detail: 'Spring not charged — motor-charge or spring feedback required before close.',
      });
      return;
    }
    if (comp.state === 'tripped' || comp.state === 'fault') {
      appendBmsSimLog(set, {
        ...base,
        ok: false,
        detail:
          comp.state === 'tripped'
            ? 'Breaker is tripped — reset protection before remote close.'
            : 'Breaker fault state — clear fault before remote close.',
      });
      return;
    }
    if (comp.state === 'on') {
      appendBmsSimLog(set, {
        ...base,
        ok: true,
        detail: 'Command accepted — main contacts already closed (no change).',
      });
      return;
    }
    get().updateComponent(id, { state: 'on' });
    appendBmsSimLog(set, {
      ...base,
      ok: true,
      detail: 'Close coil pulse accepted — mains closed.',
    });
    get().pushHistory('BMS ACB closing coil (CC pulse)');
  },

  acbBmsShuntOpen: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (!comp || comp.type !== 'air_circuit_breaker') return;
    const base = {
      deviceId: id,
      label: comp.label,
      deviceKind: 'ACB' as const,
      command: 'ACB shunt trip',
    };
    if (!comp.properties.acbBmsEnabled) {
      appendBmsSimLog(set, {
        ...base,
        ok: false,
        detail: 'BMS is disabled on this breaker.',
      });
      return;
    }
    if (comp.state !== 'on') {
      appendBmsSimLog(set, {
        ...base,
        ok: false,
        detail:
          comp.state === 'tripped'
            ? 'Already tripped — shunt open not applied (use reset).'
            : 'Main contacts already open — shunt trip not applicable.',
      });
      return;
    }
    get().updateComponent(id, { state: 'off' });
    appendBmsSimLog(set, {
      ...base,
      ok: true,
      detail: 'Shunt trip accepted — mains opened.',
    });
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
    const base = {
      deviceId: id,
      label: comp.label,
      deviceKind: 'mMCCB' as const,
      command: 'mMCCB motor close',
    };
    if (!p.mccbBmsEnabled) {
      appendBmsSimLog(set, {
        ...base,
        ok: false,
        detail: 'BMS is disabled on this breaker.',
      });
      return;
    }
    if (p.mccbBmsCtrlVoltageOk === false) {
      appendBmsSimLog(set, {
        ...base,
        ok: false,
        detail: 'Control voltage not OK — motor close blocked.',
      });
      return;
    }
    if (p.mccbBmsMotorReady === false) {
      appendBmsSimLog(set, {
        ...base,
        ok: false,
        detail: 'Motor / mechanism not ready — close blocked.',
      });
      return;
    }
    if (comp.state === 'tripped' || comp.state === 'fault') {
      appendBmsSimLog(set, {
        ...base,
        ok: false,
        detail:
          comp.state === 'tripped'
            ? 'Breaker is tripped — reset before remote close.'
            : 'Fault state — clear before remote close.',
      });
      return;
    }
    if (comp.state === 'on') {
      appendBmsSimLog(set, {
        ...base,
        ok: true,
        detail: 'Command accepted — contacts already closed (no change).',
      });
      return;
    }
    get().updateComponent(id, { state: 'on' });
    appendBmsSimLog(set, {
      ...base,
      ok: true,
      detail: 'Motor close accepted — mains closed.',
    });
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
    const base = {
      deviceId: id,
      label: comp.label,
      deviceKind: 'mMCCB' as const,
      command: 'mMCCB shunt open',
    };
    if (!comp.properties.mccbBmsEnabled) {
      appendBmsSimLog(set, {
        ...base,
        ok: false,
        detail: 'BMS is disabled on this breaker.',
      });
      return;
    }
    if (comp.state !== 'on') {
      appendBmsSimLog(set, {
        ...base,
        ok: false,
        detail:
          comp.state === 'tripped'
            ? 'Already tripped — shunt open not applied (use reset).'
            : 'Contacts already open — shunt open not applicable.',
      });
      return;
    }
    get().updateComponent(id, { state: 'off' });
    appendBmsSimLog(set, {
      ...base,
      ok: true,
      detail: 'Shunt open accepted — mains opened.',
    });
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
    set((state) => {
      const id = uuid();
      const auto = wire.wireNumberAuto === true;
      const draft: Wire = { ...(wire as Wire), id };
      let wireNumber = wire.wireNumber;
      if (auto) {
        wireNumber = deriveEndpointWireNumber(state.circuit, draft);
      } else {
        if (wireNumber === undefined || wireNumber === '') {
          wireNumber = nextWireNumber(state.circuit);
        }
      }
      const newWire: Wire = {
        ...(wire as Wire),
        id,
        wireNumber,
        wireNumberAuto: auto ? true : false,
      };
      return {
        circuit: {
          ...state.circuit,
          wires: [...state.circuit.wires, newWire],
          updatedAt: new Date().toISOString(),
        },
      };
    });
    get().pushHistory('Added wire');
    get().runSimulation();
  },

  updateWire: (id, updates) => {
    set((state) => {
      const prev = state.circuit.wires.find((w) => w.id === id);
      if (!prev) return state;
      let merged: Wire = { ...prev, ...updates };
      if (merged.wireNumberAuto === true) {
        merged = {
          ...merged,
          wireNumberAuto: true,
          wireNumber: deriveEndpointWireNumber(state.circuit, merged),
        };
      } else if (updates.wireNumber !== undefined) {
        merged.wireNumberAuto = false;
      } else if (updates.wireNumberAuto === false) {
        merged.wireNumberAuto = false;
      }
      const wires = state.circuit.wires.map((w) =>
        w.id === id ? merged : w
      );
      return {
        circuit: {
          ...state.circuit,
          wires,
          updatedAt: new Date().toISOString(),
        },
      };
    });
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
      selectedId: state.selectedId === id ? null : state.selectedId,
      wireGripVertexIndex:
        state.selectedId === id ? null : state.wireGripVertexIndex,
    }));
    get().pushHistory('Removed wire');
    get().runSimulation();
  },

  setWirePointsLive: (wireId, points) =>
    set((state) => ({
      circuit: {
        ...state.circuit,
        wires: state.circuit.wires.map((w) =>
          w.id === wireId ? { ...w, points: points.slice() } : w
        ),
        updatedAt: new Date().toISOString(),
      },
    })),

  commitWireGripEdit: (wireId, draggedVertexIndex) => {
    const state = get();
    const wire = state.circuit.wires.find((w) => w.id === wireId);
    if (!wire) return;
    const finalized = finalizeWirePolylineForCommit(state.circuit, wire, {
      draggedVertexIndex,
      gridSnapEnabled: state.wireGridSnapEnabled,
      gridSize: state.circuit.gridSize,
      zoom: state.circuit.zoom,
    });
    const nextCircuit = refreshAutoWireNumbers(
      syncWireEndpoints({
        ...state.circuit,
        wires: state.circuit.wires.map((w) =>
          w.id === wireId ? finalized : w
        ),
        updatedAt: new Date().toISOString(),
      })
    );
    set({ circuit: nextCircuit });
    get().pushHistory('Adjusted wire route');
    get().runSimulation();
  },

  setWireGripVertexIndex: (index) => set({ wireGripVertexIndex: index }),

  insertWireVertex: (wireId, segmentIndex, worldX, worldY) => {
    const state = get();
    const wire = state.circuit.wires.find((w) => w.id === wireId);
    if (!wire) return;
    const next = insertVertexOnWireSegment(
      wire.points,
      segmentIndex,
      worldX,
      worldY
    );
    if (!next) return;
    const draft = { ...wire, points: next };
    const finalized = finalizeWirePolylineForCommit(state.circuit, draft, {
      draggedVertexIndex: null,
      gridSnapEnabled: state.wireGridSnapEnabled,
      gridSize: state.circuit.gridSize,
      zoom: state.circuit.zoom,
    });
    const nextCircuit = syncWireEndpoints({
      ...state.circuit,
      wires: state.circuit.wires.map((w) =>
        w.id === wireId ? finalized : w
      ),
      updatedAt: new Date().toISOString(),
    });
    set({ circuit: nextCircuit, wireGripVertexIndex: null });
    get().pushHistory('Inserted wire vertex');
    get().runSimulation();
  },

  removeWireVertex: (wireId, vertexIndex) => {
    const state = get();
    const wire = state.circuit.wires.find((w) => w.id === wireId);
    if (!wire) return;
    const next = removeInteriorWireVertex(wire.points, vertexIndex);
    if (!next) return;
    const draft = { ...wire, points: next };
    const finalized = finalizeWirePolylineForCommit(state.circuit, draft, {
      draggedVertexIndex: null,
      gridSnapEnabled: state.wireGridSnapEnabled,
      gridSize: state.circuit.gridSize,
      zoom: state.circuit.zoom,
    });
    const nextCircuit = syncWireEndpoints({
      ...state.circuit,
      wires: state.circuit.wires.map((w) =>
        w.id === wireId ? finalized : w
      ),
      updatedAt: new Date().toISOString(),
    });
    set({ circuit: nextCircuit, wireGripVertexIndex: null });
    get().pushHistory('Removed wire vertex');
    get().runSimulation();
  },

  moveWireSegment: (wireId, segmentIndex, deltaX, deltaY) => {
    const state = get();
    const wire = state.circuit.wires.find((w) => w.id === wireId);
    if (!wire) return;
    const next = translateWireSegment(
      wire.points,
      segmentIndex,
      deltaX,
      deltaY
    );
    if (!next) return;
    const draft = { ...wire, points: next };
    const finalized = finalizeWirePolylineForCommit(state.circuit, draft, {
      draggedVertexIndex: null,
      gridSnapEnabled: state.wireGridSnapEnabled,
      gridSize: state.circuit.gridSize,
      zoom: state.circuit.zoom,
    });
    const nextCircuit = syncWireEndpoints({
      ...state.circuit,
      wires: state.circuit.wires.map((w) =>
        w.id === wireId ? finalized : w
      ),
      updatedAt: new Date().toISOString(),
    });
    set({ circuit: nextCircuit });
    get().pushHistory('Moved wire segment');
    get().runSimulation();
  },

  moveWireVertex: (wireId, vertexIndex, x, y) => {
    const state = get();
    const wire = state.circuit.wires.find((w) => w.id === wireId);
    if (!wire) return;
    const pts = [...wire.points];
    if (vertexIndex < 0 || vertexIndex * 2 + 1 >= pts.length) return;
    pts[vertexIndex * 2] = x;
    pts[vertexIndex * 2 + 1] = y;
    get().setWirePointsLive(wireId, pts);
    get().commitWireGripEdit(wireId, vertexIndex);
  },

  startWire: (componentId, pointId) => {
    const comp = get().circuit.components.find(
      (c) => c.id === componentId
    );
    if (!comp) return;
    const point = comp.connectionPoints.find((p) => p.id === pointId);
    if (!point) return;
    const { x: absX, y: absY } = connectionPointWorld(comp, point);
    const draft = get().wireDraftDefaults;
    const fromLab = point.label ?? '';
    const stroke = resolvedWireStrokeForNewConnection(
      { ...draft, styleLayer: draft.styleLayer ?? null },
      fromLab,
      fromLab
    );
    let crossSection = 2.5;
    if (draft.styleLayer) {
      const sug = suggestedCrossSectionForLayer(draft.styleLayer);
      if (sug != null) crossSection = sug;
    }
    set({
      wireInProgress: {
        fromComponentId: componentId,
        fromPointId: pointId,
        color: stroke.color,
        ...(stroke.wireCategory ? { wireCategory: stroke.wireCategory } : {}),
        ...(stroke.styleLayer ? { styleLayer: stroke.styleLayer } : {}),
        crossSection,
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
      if (!state.wireOrthoEnabled) {
        if (x === lastX && y === lastY) return state;
        return {
          wirePoints: [...pts, x, y],
          wireOrientation: state.wireOrientation === 'h' ? 'v' : 'h',
        };
      }
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
    const useAutoRoute =
      get().wireAutoRouteEnabled &&
      pts.length === 2 &&
      fromComp &&
      fromPoint;

    if (useAutoRoute) {
      const { x: sx, y: sy } = connectionPointWorld(fromComp, fromPoint);
      const startAxis = terminalOutwardOrientation(fromComp, fromPoint);
      const endAxis = terminalOutwardOrientation(comp, point);
      const rects = buildWireObstacleRects(
        get().circuit,
        new Set([wip.fromComponentId, componentId])
      );
      allPoints = dedupeWirePoints(
        routeWireBetweenTerminals(
          sx,
          sy,
          absX,
          absY,
          startAxis,
          endAxis,
          rects,
          get().circuit.gridSize
        )
      );
    } else if (pts.length >= 2) {
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

    const wireRule = checkWireConnection(
      get().circuit,
      wip.fromComponentId,
      wip.fromPointId,
      componentId,
      pointId,
      { styleLayer: get().wireDraftDefaults.styleLayer ?? undefined }
    );
    if (!wireRule.allowed) return;

    const stroke = resolvedWireStrokeForNewConnection(
      {
        ...get().wireDraftDefaults,
        styleLayer: get().wireDraftDefaults.styleLayer ?? null,
      },
      fromPoint?.label || '',
      point.label
    );
    get().addWire({
      fromComponentId: wip.fromComponentId,
      fromPointId: wip.fromPointId,
      toComponentId: componentId,
      toPointId: pointId,
      points: allPoints,
      ...stroke,
      crossSection: wip.crossSection || 2.5,
      energized: false,
      currentAmps: 0,
      wireNumberAuto: true,
    });

    set({ wireInProgress: null, wirePoints: [], wireOrientation: 'h' });
  },

  finishWireOnWireSpan: (targetWireId, segmentIndex, worldX, worldY) => {
    const wip = get().wireInProgress;
    if (!wip || !wip.fromComponentId || !wip.fromPointId) return;

    const circuit = get().circuit;
    const maxD = teeHitToleranceWorld(circuit.zoom);
    const maxD2 = maxD * maxD;

    const targetWire = circuit.wires.find((w) => w.id === targetWireId);
    if (!targetWire) return;

    const d2 = distanceSqToWireSegment(
      targetWire.points,
      segmentIndex,
      worldX,
      worldY
    );
    if (d2 === null || d2 > maxD2) return;

    const sp = resolveSplitPointOnSegment(
      targetWire.points,
      segmentIndex,
      worldX,
      worldY
    );
    if (!sp) return;
    const { sx, sy } = sp;

    const split = splitPolylineAtPoint(
      targetWire.points,
      segmentIndex,
      sx,
      sy
    );
    if (!split) return;
    const { left, right } = split;

    const fromComp = circuit.components.find(
      (c) => c.id === wip.fromComponentId
    );
    const fromPoint = fromComp?.connectionPoints.find(
      (p) => p.id === wip.fromPointId
    );
    const fromLabel = fromPoint?.label ?? '';

    const jId = uuid();
    const jScale = clampComponentScale(0.42);
    const junc: CircuitComponent = {
      id: jId,
      type: 'junction',
      label: getDefaultLabel('junction'),
      x: sx,
      y: sy,
      scale: jScale,
      rotation: 0,
      state: getInitialState('junction'),
      selected: false,
      connectionPoints: createConnectionPoints(jId, 'junction', {}),
      properties: getDefaultProperties('junction'),
    };

    const idT1 = connectionPointIdByLabel(junc, 'T1');
    const idT2 = connectionPointIdByLabel(junc, 'T2');
    const idT3 = connectionPointIdByLabel(junc, 'T3');
    if (!idT1 || !idT2 || !idT3) return;

    const cpT3 = junc.connectionPoints.find((p) => p.id === idT3);
    if (!cpT3) return;
    const t3World = connectionPointWorld(junc, cpT3);

    const draftPts = get().wirePoints;
    let allPointsC: number[];
    const useAutoRoute =
      get().wireAutoRouteEnabled &&
      draftPts.length === 2 &&
      fromComp &&
      fromPoint;

    if (useAutoRoute) {
      const { x: sx0, y: sy0 } = connectionPointWorld(fromComp, fromPoint);
      const startAxis = terminalOutwardOrientation(fromComp, fromPoint);
      const endAxis = terminalOutwardOrientation(junc, cpT3);
      const rects = buildWireObstacleRects(
        circuit,
        new Set([wip.fromComponentId, jId])
      );
      allPointsC = dedupeWirePoints(
        routeWireBetweenTerminals(
          sx0,
          sy0,
          t3World.x,
          t3World.y,
          startAxis,
          endAxis,
          rects,
          circuit.gridSize
        )
      );
    } else if (draftPts.length >= 2) {
      allPointsC = buildBranchPolylineToPoint(draftPts, t3World.x, t3World.y);
    } else {
      allPointsC = [...draftPts, t3World.x, t3World.y];
    }

    const metaFromW: Pick<
      Wire,
      'color' | 'wireCategory' | 'wireProtocol' | 'crossSection'
    > = {
      color: targetWire.color,
      wireCategory: targetWire.wireCategory,
      wireProtocol: targetWire.wireProtocol ?? 'none',
      crossSection: targetWire.crossSection,
    };

    const branchStroke = resolvedWireStrokeForNewConnection(
      {
        ...get().wireDraftDefaults,
        styleLayer: get().wireDraftDefaults.styleLayer ?? null,
      },
      fromLabel,
      'T3'
    );
    const branchMeta: Pick<
      Wire,
      'color' | 'wireCategory' | 'wireProtocol' | 'crossSection' | 'styleLayer'
    > = {
      ...branchStroke,
      crossSection: wip.crossSection ?? 2.5,
    };

    const circuitSansTarget: Circuit = {
      ...circuit,
      wires: circuit.wires.filter((w) => w.id !== targetWireId),
    };
    const wnA = nextWireNumber(circuitSansTarget);
    const wnB = nextWireNumber(circuitSansTarget, [wnA]);
    const targetAuto = targetWire.wireNumberAuto === true;

    const wireA: Omit<Wire, 'id'> = {
      fromComponentId: targetWire.fromComponentId,
      fromPointId: targetWire.fromPointId,
      toComponentId: jId,
      toPointId: idT1,
      points: left,
      ...metaFromW,
      ...(targetAuto
        ? { wireNumberAuto: true as const }
        : { wireNumber: wnA, wireNumberAuto: false as const }),
      energized: false,
      currentAmps: 0,
    };
    const wireB: Omit<Wire, 'id'> = {
      fromComponentId: jId,
      fromPointId: idT2,
      toComponentId: targetWire.toComponentId,
      toPointId: targetWire.toPointId,
      points: right,
      ...metaFromW,
      ...(targetAuto
        ? { wireNumberAuto: true as const }
        : { wireNumber: wnB, wireNumberAuto: false as const }),
      energized: false,
      currentAmps: 0,
    };
    const wireC: Omit<Wire, 'id'> = {
      fromComponentId: wip.fromComponentId,
      fromPointId: wip.fromPointId,
      toComponentId: jId,
      toPointId: idT3,
      points: allPointsC,
      ...branchMeta,
      wireNumberAuto: true,
      energized: false,
      currentAmps: 0,
    };

    const dupC = circuit.wires.some(
      (w) =>
        (w.fromComponentId === wireC.fromComponentId &&
          w.fromPointId === wireC.fromPointId &&
          w.toComponentId === wireC.toComponentId &&
          w.toPointId === wireC.toPointId) ||
        (w.fromComponentId === wireC.toComponentId &&
          w.fromPointId === wireC.toPointId &&
          w.toComponentId === wireC.fromComponentId &&
          w.toPointId === wireC.fromPointId)
    );
    if (dupC) return;

    const wireAId = uuid();
    const wireBId = uuid();
    const wireCId = uuid();

    const newWires: Wire[] = [
      ...circuit.wires.filter((w) => w.id !== targetWireId),
      { ...wireA, id: wireAId },
      { ...wireB, id: wireBId },
      { ...wireC, id: wireCId },
    ];

    const nextCircuit = refreshAutoWireNumbers(
      syncWireEndpoints({
        ...circuit,
        components: [...circuit.components, junc],
        wires: newWires,
        updatedAt: new Date().toISOString(),
      })
    );

    set({
      circuit: nextCircuit,
      wireInProgress: null,
      wirePoints: [],
      wireOrientation: 'h',
    });
    get().pushHistory('Wire T-junction');
    get().runSimulation();
  },

  breakWireAtSpan: (wireId, segmentIndex, worldX, worldY) => {
    const circuit = get().circuit;
    const targetWire = circuit.wires.find((w) => w.id === wireId);
    if (!targetWire) return 'Wire not found';

    const maxD = teeHitToleranceWorld(circuit.zoom);
    const maxD2 = maxD * maxD;
    const d2 = distanceSqToWireSegment(
      targetWire.points,
      segmentIndex,
      worldX,
      worldY
    );
    if (d2 === null || d2 > maxD2) {
      return 'Click closer to the wire segment';
    }

    const sp = resolveSplitPointOnSegment(
      targetWire.points,
      segmentIndex,
      worldX,
      worldY
    );
    if (!sp) return 'Cannot split here';
    const { sx, sy } = sp;

    const split = splitPolylineAtPoint(
      targetWire.points,
      segmentIndex,
      sx,
      sy
    );
    if (!split) return 'Segment too short to break';

    const { left, right } = split;

    const jId = uuid();
    const jScale = clampComponentScale(0.42);
    const junc: CircuitComponent = {
      id: jId,
      type: 'junction',
      label: getDefaultLabel('junction'),
      x: sx,
      y: sy,
      scale: jScale,
      rotation: 0,
      state: getInitialState('junction'),
      selected: false,
      connectionPoints: createConnectionPoints(jId, 'junction', {}),
      properties: getDefaultProperties('junction'),
    };

    const idT1 = connectionPointIdByLabel(junc, 'T1');
    const idT2 = connectionPointIdByLabel(junc, 'T2');
    if (!idT1 || !idT2) return 'Junction layout error';

    const metaFromW: Pick<
      Wire,
      'color' | 'wireCategory' | 'wireProtocol' | 'crossSection'
    > = {
      color: targetWire.color,
      wireCategory: targetWire.wireCategory,
      wireProtocol: targetWire.wireProtocol ?? 'none',
      crossSection: targetWire.crossSection,
    };

    const circuitSansTarget: Circuit = {
      ...circuit,
      wires: circuit.wires.filter((w) => w.id !== wireId),
    };
    const wnA = nextWireNumber(circuitSansTarget);
    const wnB = nextWireNumber(circuitSansTarget, [wnA]);
    const targetAuto = targetWire.wireNumberAuto === true;

    const wireAId = uuid();
    const wireBId = uuid();
    const wireA: Wire = {
      id: wireAId,
      fromComponentId: targetWire.fromComponentId,
      fromPointId: targetWire.fromPointId,
      toComponentId: jId,
      toPointId: idT1,
      points: left,
      ...metaFromW,
      ...(targetAuto
        ? { wireNumberAuto: true as const }
        : { wireNumber: wnA, wireNumberAuto: false as const }),
      energized: false,
      currentAmps: 0,
    };
    const wireB: Wire = {
      id: wireBId,
      fromComponentId: jId,
      fromPointId: idT2,
      toComponentId: targetWire.toComponentId,
      toPointId: targetWire.toPointId,
      points: right,
      ...metaFromW,
      ...(targetAuto
        ? { wireNumberAuto: true as const }
        : { wireNumber: wnB, wireNumberAuto: false as const }),
      energized: false,
      currentAmps: 0,
    };

    const newWires: Wire[] = [
      ...circuit.wires.filter((w) => w.id !== wireId),
      wireA,
      wireB,
    ];

    const nextCircuit = refreshAutoWireNumbers(
      syncWireEndpoints({
        ...circuit,
        components: [...circuit.components, junc],
        wires: newWires,
        updatedAt: new Date().toISOString(),
      })
    );

    set({
      circuit: nextCircuit,
      selectedId: jId,
      wireGripVertexIndex: null,
      wireCadEditMode: null,
      wireTrimFirstVertexIndex: null,
    });
    get().pushHistory('Broke wire');
    get().runSimulation();
    return '';
  },

  simplifyWireCollinear: (wireId) => {
    const state = get();
    const wire = state.circuit.wires.find((w) => w.id === wireId);
    if (!wire) return 'Wire not found';
    const next = removeCollinearInteriorVertices(wire.points);
    if (next.length === wire.points.length) {
      return 'No collinear bends to remove';
    }
    const draft = { ...wire, points: next };
    const finalized = finalizeWirePolylineForCommit(state.circuit, draft, {
      draggedVertexIndex: null,
      gridSnapEnabled: state.wireGridSnapEnabled,
      gridSize: state.circuit.gridSize,
      zoom: state.circuit.zoom,
    });
    const nextCircuit = syncWireEndpoints({
      ...state.circuit,
      wires: state.circuit.wires.map((w) =>
        w.id === wireId ? finalized : w
      ),
      updatedAt: new Date().toISOString(),
    });
    set({ circuit: nextCircuit, wireGripVertexIndex: null });
    get().pushHistory('Joined collinear segments');
    get().runSimulation();
    return '';
  },

  normalizeWireRoute: (wireId) => {
    const state = get();
    const wire = state.circuit.wires.find((w) => w.id === wireId);
    if (!wire) return 'Wire not found';
    const grid =
      state.wireGridSnapEnabled && state.circuit.gridSize > 0
        ? state.circuit.gridSize
        : undefined;
    const nextPts = normalizeWirePoints(wire.points, {
      alignToGrid: grid,
      nearAxisEps: grid != null ? Math.max(1, grid * 0.2) : 2,
    });
    const unchanged =
      nextPts.length === wire.points.length &&
      nextPts.every((v: number, i: number) => v === wire.points[i]);
    if (unchanged) {
      return 'Route already normalized';
    }
    const draft = { ...wire, points: nextPts };
    const finalized = finalizeWirePolylineForCommit(state.circuit, draft, {
      draggedVertexIndex: null,
      gridSnapEnabled: state.wireGridSnapEnabled,
      gridSize: state.circuit.gridSize,
      zoom: state.circuit.zoom,
    });
    const nextCircuit = syncWireEndpoints({
      ...state.circuit,
      wires: state.circuit.wires.map((w) =>
        w.id === wireId ? finalized : w
      ),
      updatedAt: new Date().toISOString(),
    });
    set({ circuit: nextCircuit, wireGripVertexIndex: null });
    get().pushHistory('Normalized wire route');
    get().runSimulation();
    return '';
  },

  mergeWiresAtJunction: (junctionComponentId) => {
    const state = get();
    const circuit = state.circuit;
    const j = circuit.components.find(
      (c) => c.id === junctionComponentId && c.type === 'junction'
    );
    if (!j) return 'Select a junction';
    const incident = circuit.wires.filter(
      (w) =>
        w.fromComponentId === junctionComponentId ||
        w.toComponentId === junctionComponentId
    );
    if (incident.length !== 2) {
      return 'Junction must have exactly two wires (e.g. inline tee stub removed)';
    }
    const [w1, w2] = incident;
    const merged = tryMergeWirePairAtJunction(w1, w2, junctionComponentId, uuid());
    if (!merged) {
      return 'Could not chain wires through this junction (try reversing route)';
    }
    const mergedWithAuto: Wire = {
      ...merged,
      wireNumberAuto:
        w1.wireNumberAuto === true || w2.wireNumberAuto === true,
    };
    const newWires = circuit.wires
      .filter((w) => w.id !== w1.id && w.id !== w2.id)
      .concat(mergedWithAuto);
    const newComps = circuit.components.filter((c) => c.id !== junctionComponentId);
    const nextCircuit = refreshAutoWireNumbers(
      syncWireEndpoints({
        ...circuit,
        components: newComps,
        wires: newWires,
        updatedAt: new Date().toISOString(),
      })
    );
    set({
      circuit: nextCircuit,
      selectedId: merged.id,
      wireGripVertexIndex: null,
      wireCadEditMode: null,
      wireTrimFirstVertexIndex: null,
    });
    get().pushHistory('Merged wires at junction');
    get().runSimulation();
    return '';
  },

  trimWireBetweenGrips: (wireId, vertexIndexA, vertexIndexB) => {
    const state = get();
    const wire = state.circuit.wires.find((w) => w.id === wireId);
    if (!wire) return 'Wire not found';
    const n = wire.points.length / 2;
    if (
      vertexIndexA <= 0 ||
      vertexIndexB <= 0 ||
      vertexIndexA >= n - 1 ||
      vertexIndexB >= n - 1
    ) {
      return 'Pick two interior vertex grips (not endpoints)';
    }
    const nextPts = trimWireBetweenVertexIndices(
      wire.points,
      vertexIndexA,
      vertexIndexB
    );
    if (!nextPts) return 'Could not rebuild route between those vertices';
    const draft = { ...wire, points: nextPts };
    const finalized = finalizeWirePolylineForCommit(state.circuit, draft, {
      draggedVertexIndex: null,
      gridSnapEnabled: state.wireGridSnapEnabled,
      gridSize: state.circuit.gridSize,
      zoom: state.circuit.zoom,
    });
    const nextCircuit = refreshAutoWireNumbers(
      syncWireEndpoints({
        ...state.circuit,
        wires: state.circuit.wires.map((w) =>
          w.id === wireId ? finalized : w
        ),
        updatedAt: new Date().toISOString(),
      })
    );
    set({
      circuit: nextCircuit,
      wireGripVertexIndex: null,
      wireTrimFirstVertexIndex: null,
    });
    get().pushHistory('Trimmed wire');
    get().runSimulation();
    return '';
  },

  extendWireToCutterHit: (cutterWireId, worldX, worldY) => {
    const state = get();
    const sel = state.selectedId;
    if (!sel) return 'Select the wire to extend first';
    const base = state.circuit.wires.find((w) => w.id === sel);
    const cutter = state.circuit.wires.find((w) => w.id === cutterWireId);
    if (!base || !cutter) return 'Wire not found';
    const hit = hitTestClosestWireSegment(
      state.circuit,
      worldX,
      worldY,
      { zoom: state.circuit.zoom }
    );
    if (!hit || hit.wireId !== cutterWireId) {
      return 'Click directly on the crossing wire';
    }
    const nextPts =
      state.wireCadExtendEnd === 'from'
        ? extendWireFromStartTowardHit(base, cutter)
        : extendWireFromEndTowardHit(base, cutter);
    if (!nextPts) {
      return 'No axis-aligned crossing ahead (needs ≥3 vertices for that end)';
    }
    const draft = { ...base, points: nextPts.points };
    const finalized = finalizeWirePolylineForCommit(state.circuit, draft, {
      draggedVertexIndex: null,
      gridSnapEnabled: state.wireGridSnapEnabled,
      gridSize: state.circuit.gridSize,
      zoom: state.circuit.zoom,
    });
    const nextCircuit = refreshAutoWireNumbers(
      syncWireEndpoints({
        ...state.circuit,
        wires: state.circuit.wires.map((w) =>
          w.id === base.id ? finalized : w
        ),
        updatedAt: new Date().toISOString(),
      })
    );
    set({ circuit: nextCircuit, wireCadEditMode: null, wireTrimFirstVertexIndex: null });
    get().pushHistory('Extended wire');
    get().runSimulation();
    return '';
  },

  setWireCadEditMode: (mode) =>
    set({ wireCadEditMode: mode, wireTrimFirstVertexIndex: null }),
  setWireCadExtendEnd: (end) => set({ wireCadExtendEnd: end }),
  clearWireCadEditMode: () =>
    set({ wireCadEditMode: null, wireTrimFirstVertexIndex: null }),
  setWireTrimFirstVertexIndex: (index) =>
    set({ wireTrimFirstVertexIndex: index }),

  cancelWire: () => {
    set({ wireInProgress: null, wirePoints: [], wireOrientation: 'h' });
  },

  undoLastWirePoint: () => {
    set((state) => {
      if (!state.wireInProgress) return state;
      const pts = state.wirePoints;
      if (pts.length <= 2) return state;
      return {
        wirePoints: pts.slice(0, -2),
        wireOrientation: state.wireOrientation === 'h' ? 'v' : 'h',
      };
    });
  },

  setWireObjectSnapEnabled: (v) => set({ wireObjectSnapEnabled: v }),
  setWireGridSnapEnabled: (v) => set({ wireGridSnapEnabled: v }),
  setWireOrthoEnabled: (v) => set({ wireOrthoEnabled: v }),
  toggleWireObjectSnap: () =>
    set((s) => ({ wireObjectSnapEnabled: !s.wireObjectSnapEnabled })),
  toggleWireGridSnap: () =>
    set((s) => ({ wireGridSnapEnabled: !s.wireGridSnapEnabled })),
  toggleWireOrtho: () =>
    set((s) => ({ wireOrthoEnabled: !s.wireOrthoEnabled })),
  toggleWireAutoRoute: () =>
    set((s) => ({ wireAutoRouteEnabled: !s.wireAutoRouteEnabled })),
  toggleWireOrientation: () =>
    set((s) => {
      if (!s.wireInProgress) return s;
      return {
        wireOrientation: s.wireOrientation === 'h' ? 'v' : 'h',
      };
    }),

  setWireSnapModes: (partial) =>
    set((s) => ({
      wireSnapModes: { ...s.wireSnapModes, ...partial },
    })),
  toggleWireSnapMode: (key) =>
    set((s) => ({
      wireSnapModes: {
        ...s.wireSnapModes,
        [key]: !s.wireSnapModes[key],
      },
    })),
  resetWireSnapModes: () =>
    set({ wireSnapModes: { ...DEFAULT_WIRE_OBJECT_SNAP_MODES } }),

  patchWireDraftStyle: (partial) =>
    set((state) => {
      const prev = state.wireDraftDefaults;
      const defaults: {
        color: WireColor | null;
        wireCategory: 'power' | 'control' | 'comm' | null;
        styleLayer: WireStyleLayer | null;
      } = { ...prev, ...partial };
      if (partial.styleLayer) {
        const L = applyWireStyleLayerDefaults(partial.styleLayer);
        defaults.styleLayer = partial.styleLayer;
        if (partial.color === undefined && prev.color === null) {
          defaults.color = L.color;
        }
        if (partial.wireCategory === undefined && prev.wireCategory === null) {
          defaults.wireCategory = L.wireCategory ?? 'control';
        }
      }
      if (partial.styleLayer === null) {
        defaults.styleLayer = null;
      }

      const wip = state.wireInProgress;
      if (!wip?.fromComponentId || !wip.fromPointId) {
        return { wireDraftDefaults: defaults };
      }
      const fromComp = state.circuit.components.find(
        (c) => c.id === wip.fromComponentId
      );
      const fromPt = fromComp?.connectionPoints.find(
        (p) => p.id === wip.fromPointId
      );
      const fromLab = fromPt?.label ?? '';
      const stroke = resolvedWireStrokeForNewConnection(
        {
          color: defaults.color,
          wireCategory: defaults.wireCategory,
          styleLayer: defaults.styleLayer ?? null,
        },
        fromLab,
        fromLab
      );
      const nextWip: Partial<Wire> = { ...wip };
      nextWip.color = stroke.color;
      if (stroke.wireCategory) {
        nextWip.wireCategory = stroke.wireCategory;
      } else {
        delete nextWip.wireCategory;
      }
      if (stroke.styleLayer) {
        nextWip.styleLayer = stroke.styleLayer;
      } else {
        delete nextWip.styleLayer;
      }
      let cs = wip.crossSection ?? 2.5;
      if (defaults.styleLayer) {
        const sug = suggestedCrossSectionForLayer(defaults.styleLayer);
        if (sug != null) cs = sug;
      }
      nextWip.crossSection = cs;
      return { wireDraftDefaults: defaults, wireInProgress: nextWip };
    }),

  setSelected: (id, options) =>
    set((state) => {
      const clearGrip =
        Boolean(options?.clearWireGrip) ||
        id === null ||
        (id !== null && id !== state.selectedId);
      return {
        selectedId: id,
        wireGripVertexIndex: clearGrip ? null : state.wireGripVertexIndex,
        circuit: {
          ...state.circuit,
          components: state.circuit.components.map((c) => ({
            ...c,
            selected: id !== null && c.id === id,
          })),
        },
      };
    }),
  setTool: (tool) => {
    set({
      tool,
      wireGripVertexIndex: null,
      wireCadEditMode: null,
      wireTrimFirstVertexIndex: null,
    });
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
      wireGripVertexIndex: null,
      history: [],
      historyIndex: -1,
      bmsSimLog: [],
      wireDraftDefaults: { color: null, wireCategory: null, styleLayer: null },
      wireInProgress: null,
      wirePoints: [],
      wireOrientation: 'h',
      wireCadEditMode: null,
      wireTrimFirstVertexIndex: null,
    });
  },

  loadCircuit: (circuit) => {
    let wires = circuit.wires;
    const withPush = circuit.components.map((c) =>
      c.type === 'push_button' && !('pressed' in c)
        ? { ...c, pressed: false }
        : c
    );
    const afterMcb = withPush.map((c) => {
      if (c.type !== 'mcb') return c;
      if ((c.properties.poles ?? 1) !== 2) return c;
      const labs = new Set(c.connectionPoints.map((p) => labelNorm(p.label)));
      if (
        labs.has('1') &&
        labs.has('2') &&
        labs.has('3') &&
        labs.has('4')
      ) {
        return c;
      }
      const newCps = createConnectionPoints(c.id, 'mcb', { mcbPoles: 2 });
      const remap = buildPointRemapByLabels(c, newCps, [
        ['IN', '1'],
        ['OUT', '2'],
        ['IN_L', '1'],
        ['OUT_L', '2'],
        ['IN_N', '3'],
        ['OUT_N', '4'],
        ['1', '1'],
        ['2', '2'],
        ['3', '3'],
        ['4', '4'],
      ]);
      wires = remapWireEndpointsForMorph(wires, c.id, remap);
      return { ...c, connectionPoints: newCps };
    });
    const components = afterMcb.map((c) => {
      if (c.type !== 'rcd' && c.type !== 'residual_current_circuit_breaker') {
        return c;
      }
      const poles = (c.properties.poles ?? 2) >= 4 ? 4 : 2;
      const labs = new Set(c.connectionPoints.map((p) => labelNorm(p.label)));
      const hasModern2 =
        poles === 2 &&
        labs.has('1') &&
        labs.has('2') &&
        labs.has('3') &&
        labs.has('4');
      const hasModern4 =
        poles === 4 &&
        ['1', '2', '3', '4', '5', '6', '7', '8'].every((d) => labs.has(d));
      if (hasModern2 || hasModern4) return c;

      const newCps = createConnectionPoints(c.id, c.type, {
        rcdPoles: poles === 4 ? 4 : 2,
      });
      const pairs: [string, string][] =
        poles === 4
          ? [
              ['IN_L1', '1'],
              ['OUT_L1', '2'],
              ['IN_L2', '3'],
              ['OUT_L2', '4'],
              ['IN_L3', '5'],
              ['OUT_L3', '6'],
              ['IN_N', '7'],
              ['OUT_N', '8'],
              ['1', '1'],
              ['2', '2'],
              ['3', '3'],
              ['4', '4'],
              ['5', '5'],
              ['6', '6'],
              ['7', '7'],
              ['8', '8'],
            ]
          : [
              ['IN_L', '1'],
              ['OUT_L', '2'],
              ['IN_N', '3'],
              ['OUT_N', '4'],
              ['1', '1'],
              ['2', '2'],
              ['3', '3'],
              ['4', '4'],
            ];
      const remap = buildPointRemapByLabels(c, newCps, pairs);
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
    set({
      circuit: refreshAutoWireNumbers(normalized),
      selectedId: null,
      wireGripVertexIndex: null,
      bmsSimLog: [],
      wireDraftDefaults: { color: null, wireCategory: null, styleLayer: null },
      wireInProgress: null,
      wirePoints: [],
      wireOrientation: 'h',
      wireCadEditMode: null,
      wireTrimFirstVertexIndex: null,
    });
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
        wireLabelsVisible: c.wireLabelsVisible !== false,
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

  exportWireScheduleCsv: () => {
    const c = get().circuit;
    downloadWireScheduleCsv(c, c.name || 'circuit');
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const entry = history[newIndex];
    set({
      circuit: JSON.parse(JSON.stringify(entry.circuit)),
      bmsSimLog: JSON.parse(
        JSON.stringify(entry.bmsSimLog ?? [])
      ),
      historyIndex: newIndex,
      wireGripVertexIndex: null,
    });
    get().runSimulation();
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const entry = history[newIndex];
    set({
      circuit: JSON.parse(JSON.stringify(entry.circuit)),
      bmsSimLog: JSON.parse(
        JSON.stringify(entry.bmsSimLog ?? [])
      ),
      historyIndex: newIndex,
      wireGripVertexIndex: null,
    });
    get().runSimulation();
  },

  pushHistory: (description) => {
    const circuit = JSON.parse(JSON.stringify(get().circuit));
    const bmsSimLog = JSON.parse(JSON.stringify(get().bmsSimLog));
    set((state) => {
      const trimmed = state.history.slice(
        0,
        state.historyIndex + 1
      );
      const newHistory = [
        ...trimmed,
        { circuit, description, bmsSimLog },
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

  setCircuitWireLabelsVisible: (visible) =>
    set((state) => ({
      circuit: {
        ...state.circuit,
        wireLabelsVisible: visible,
        updatedAt: new Date().toISOString(),
      },
    })),
}));
