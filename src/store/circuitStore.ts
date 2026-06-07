import { create } from 'zustand';
import type {
  Circuit,
  CircuitComponent,
  Wire,
  WireColor,
  WireStyleLayer,
} from '../types';
import { DEFAULT_WIRE_OBJECT_SNAP_MODES } from '../types';
import { simulateCircuitAsync } from '../simulation/simulationClient';
import { resolveAtsConfig } from '../simulation/atsTransferSequence';
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
  remapWireEndpointsForMorph,
  buildPointRemapByLabels,
  ensureBreakerControlTerminals,
} from './circuitConnectionGeometry';

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
import { downloadBomCsv } from '../utils/bomExport';
import { downloadTerminalScheduleCsv } from '../utils/terminalScheduleExport';
import { downloadCableScheduleCsv } from '../utils/cableScheduleExport';
import {
  downloadPanelScheduleCsv,
  downloadPanelSchedulePdf,
} from '../utils/panelScheduleExport';
import {
  appendHistoryEntry,
  initialHistorySnapshot,
  redoHistoryStep,
  undoHistoryStep,
} from './circuitHistory';
import {
  applyWireStyleLayerDefaults,
  suggestedCrossSectionForLayer,
} from '../utils/wireStyleLayers';
import { useDrawingLayerStore } from './drawingLayerStore';
import { inferWireDrawingLayer } from '../utils/drawingLayers';
import { createComponentActions } from './slices/componentActions';
import { createFeederActions } from './slices/feederActions';
import { createDesignatorActions } from './slices/designatorActions';
import { createSelectionActions } from './slices/selectionActions';
import { createWireRoutingActions } from './slices/wireRoutingActions';
import { createDrawingExportActions } from './slices/drawingExportActions';
import { createProjectActions } from './slices/projectActions';
import { createReviewCommentActions } from './slices/reviewCommentActions';
import { createPluginActions } from './slices/pluginActions';
import { createLibraryActions } from './slices/libraryActions';
import {
  activeSheetCircuit,
  createEmptyProject,
} from '../utils/projectPersistence';
import { establishSheetSaveBaselines } from '../utils/sheetDirtyState';
import {
  collectBundleDragSnapshot,
  translateBundleSegment,
} from '../utils/wireBundle';
import { createBmsActions } from './slices/bmsActions';
import type { CircuitStore } from './circuitStoreTypes';

export type { CircuitStore, DrawingMetadataPatch } from './circuitStoreTypes';

/**
 * Maximum undo/redo steps. Patch entries store immer deltas instead of full
 * circuit clones (baseline index 0 keeps one snapshot).
 */
const MAX_HISTORY_SIZE = 50;

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

/** Cancels stale async simulation results when edits outpace the worker. */
let simulationRequestSeq = 0;

export const globalMouseContext = {
  worldX: 0,
  worldY: 0,
  isOverCanvas: false,
};

const bootstrapProject = createEmptyProject();
const bootstrapCircuit =
  activeSheetCircuit(bootstrapProject) ?? createEmptyCircuit();

export const useCircuitStore = create<CircuitStore>((set, get) => ({
  project: bootstrapProject,
  circuit: bootstrapCircuit,
  sheetSaveBaselines: establishSheetSaveBaselines(bootstrapProject),
  simulationResult: null,
  simulationPending: false,
  atsSequenceTimeMs: 0,
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
  clipboard: null,

  // --- Component actions (extracted to slices/componentActions.ts) ---
  ...createComponentActions(set, get),
  ...createFeederActions(set, get),
  ...createDesignatorActions(set, get),
  ...createSelectionActions(set, get),
  ...createWireRoutingActions(set, get),
  ...createDrawingExportActions(set, get),
  ...createProjectActions(set, get),
  ...createReviewCommentActions(set, get),
  ...createPluginActions(set, get),
  ...createLibraryActions(set, get),

  // --- BMS actions (extracted to slices/bmsActions.ts) ---
  ...createBmsActions(set, get),


  addWire: (wire) => {
    set((state) => {
      const id = uuid();
      const auto = wire.wireNumberAuto === true;
      const draft: Wire = { ...wire, id };
      let wireNumber = wire.wireNumber;
      if (auto) {
        wireNumber = deriveEndpointWireNumber(state.circuit, draft);
      } else {
        if (wireNumber === undefined || wireNumber === '') {
          wireNumber = nextWireNumber(state.circuit);
        }
      }
      const newWire: Wire = {
        ...wire,
        id,
        wireNumber,
        wireNumberAuto: auto ? true : false,
        drawingLayer:
          wire.drawingLayer ??
          inferWireDrawingLayer({ ...wire, id, wireNumber }),
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
    const snapshot = collectBundleDragSnapshot(
      state.circuit,
      wireId,
      segmentIndex
    );
    const moved = translateBundleSegment(
      snapshot,
      wireId,
      segmentIndex,
      deltaX,
      deltaY
    );
    if (moved.size === 0) return;
    get().setWirePointsLiveBatch(
      [...moved.entries()].map(([id, points]) => ({
        wireId: id,
        points,
      }))
    );
    get().commitWireSegmentBundle([...moved.keys()]);
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
      drawingLayer: useDrawingLayerStore.getState().activeLayer,
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
    const reqId = ++simulationRequestSeq;
    const base = get().circuit;
    const normalized = {
      ...base,
      components: base.components.map(ensureBreakerControlTerminals),
    };
    const clonedCircuit = structuredClone(syncWireEndpoints(normalized));
    set({ circuit: clonedCircuit, simulationPending: true });
    const wallMs = Date.now();
    const prevTs = get().simulationResult?.timestamp;
    const simStepMs =
      prevTs != null && prevTs > 0
        ? Math.min(Math.max(0, wallMs - prevTs), 120_000)
        : 0;
    const hasAts = resolveAtsConfig(clonedCircuit) != null;
    const atsSequenceTimeMs = hasAts
      ? get().atsSequenceTimeMs + simStepMs
      : 0;
    void simulateCircuitAsync(clonedCircuit, wallMs, simStepMs, atsSequenceTimeMs)
      .then((result) => {
        if (reqId !== simulationRequestSeq) return;
        set({
          simulationResult: result,
          simulationPending: false,
          atsSequenceTimeMs,
          faultDialogEvent:
            result.faults.length > 0 ? result.faults[0] : null,
        });
      })
      .catch(() => {
        if (reqId !== simulationRequestSeq) return;
        set({ simulationPending: false });
      });
  },

  clearCircuit: () => {
    get().newProject();
  },

  loadCircuit: (circuit) => {
    get().loadCircuitAsProject(circuit);
  },

  hydrateCircuit: (circuit) => {
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
    const synced = refreshAutoWireNumbers(syncWireEndpoints(normalized));
    const hist = initialHistorySnapshot(synced, [], 'Loaded circuit');
    set({
      circuit: synced,
      selectedId: null,
      wireGripVertexIndex: null,
      bmsSimLog: [],
      simulationResult: null,
      atsSequenceTimeMs: 0,
      history: hist.history,
      historyIndex: hist.historyIndex,
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
    get().saveProject();
  },

  exportWireScheduleCsv: () => {
    const c = get().circuit;
    downloadWireScheduleCsv(c, c.name || 'circuit');
  },

  exportBomCsv: () => {
    const c = get().circuit;
    downloadBomCsv(c, c.name || 'circuit');
  },

  exportTerminalScheduleCsv: () => {
    const c = get().circuit;
    downloadTerminalScheduleCsv(c, c.name || 'circuit');
  },

  exportCableScheduleCsv: () => {
    const c = get().circuit;
    downloadCableScheduleCsv(c, c.name || 'circuit');
  },

  exportPanelScheduleCsv: () => {
    const c = get().circuit;
    downloadPanelScheduleCsv(c, c.name || 'circuit');
  },

  exportPanelSchedulePdf: () => {
    const { circuit, project } = get();
    try {
      downloadPanelSchedulePdf(circuit, project, circuit.name || 'circuit');
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Panel schedule PDF export failed.';
    }
  },

  undo: () => {
    const { history, historyIndex, circuit } = get();
    const step = undoHistoryStep(history, historyIndex, circuit);
    if (!step) return;
    const entry = history[historyIndex];
    set({
      circuit: step.circuit,
      bmsSimLog: structuredClone(entry.bmsSimLog ?? []),
      historyIndex: step.historyIndex,
      wireGripVertexIndex: null,
    });
    get().runSimulation();
  },

  redo: () => {
    const { history, historyIndex, circuit } = get();
    const step = redoHistoryStep(history, historyIndex, circuit);
    if (!step) return;
    const entry = history[step.historyIndex];
    set({
      circuit: step.circuit,
      bmsSimLog: structuredClone(entry.bmsSimLog ?? []),
      historyIndex: step.historyIndex,
      wireGripVertexIndex: null,
    });
    get().runSimulation();
  },

  pushHistory: (() => {
    /**
     * Debounce guard: skip duplicate pushes of the same description within
     * 80 ms. This prevents rapid-fire duplicate entries from mouse operations
     * (e.g. drag-move calls pushHistory on every pointer-up, and double-clicks
     * can fire two "Toggled X" pushes within a single animation frame).
     */
    let lastDesc = '';
    let lastTs = 0;

    return (description: string) => {
      const now = Date.now();
      if (description === lastDesc && now - lastTs < 80) return;
      lastDesc = description;
      lastTs = now;

      const st = get();
      const { history, historyIndex } = appendHistoryEntry(
        st.history,
        st.historyIndex,
        st.circuit,
        st.bmsSimLog,
        description,
        MAX_HISTORY_SIZE
      );
      set({ history, historyIndex });
    };
  })(),

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

  setContinuityPowerThresholdW: (watts) => {
    const w = Math.min(500, Math.max(0.01, Number(watts) || 0.5));
    set((state) => ({
      circuit: {
        ...state.circuit,
        continuityPowerThresholdW: w,
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
