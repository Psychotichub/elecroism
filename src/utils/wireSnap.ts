import type { Circuit, Wire, WireObjectSnapModes } from '../types';
import {
  connectionPointWorld,
  distance,
  snapToGrid,
} from './geometry';

export type WireSnapKind =
  | 'terminal'
  | 'wire_endpoint'
  | 'wire_midpoint'
  | 'wire_intersection'
  | 'grid'
  | 'orthogonal';

export type WireSnapResult = {
  kind: WireSnapKind;
  x: number;
  y: number;
  distance: number;
  label: string;
  componentId?: string;
  pointId?: string;
  wireId?: string;
};

const SNAP_LABEL: Record<WireSnapKind, string> = {
  terminal: 'TERM',
  wire_endpoint: 'END',
  wire_midpoint: 'MID',
  wire_intersection: 'INT',
  grid: 'GRID',
  orthogonal: '',
};

/** Lower = higher priority when distances are equal. */
const SNAP_PRIORITY: Record<WireSnapKind, number> = {
  terminal: 0,
  wire_endpoint: 1,
  wire_midpoint: 2,
  wire_intersection: 3,
  grid: 4,
  orthogonal: 5,
};

export type WireSnapResolveInput = {
  pointerWorld: { x: number; y: number };
  wirePoints: number[];
  wireOrientation: 'h' | 'v';
  circuit: Circuit;
  zoom: number;
  objectSnapEnabled: boolean;
  /** Which object snaps are active (ignored if objectSnapEnabled is false). */
  snapModes: WireObjectSnapModes;
  gridSnapEnabled: boolean;
  /** Hold Ctrl to skip object/grid snaps (free ortho leg). */
  ctrlHeld: boolean;
  /**
   * When true, snap/compare along the horizontal or vertical leg from the last
   * vertex. When false, use the pointer in the plane (non-ortho wire).
   * Shift typically forces this true while drawing.
   */
  useOrthoLeg: boolean;
  /** When set, dock preview to this terminal (respects connection mode). */
  hoveredTerminalWorld: { x: number; y: number } | null;
};

/** Project pointer onto the active orthogonal leg from the last vertex. */
export function orthoProjectForWireLeg(
  px: number,
  py: number,
  wirePoints: number[],
  wireOrientation: 'h' | 'v'
): { x: number; y: number } {
  if (wirePoints.length < 2) return { x: px, y: py };
  const lastX = wirePoints[wirePoints.length - 2];
  const lastY = wirePoints[wirePoints.length - 1];
  if (wireOrientation === 'h') return { x: px, y: lastY };
  return { x: lastX, y: py };
}

type HSeg = { y: number; x1: number; x2: number; wireId: string; i: number };
type VSeg = { x: number; y1: number; y2: number; wireId: string; i: number };

function axisAlignedSegments(w: Wire): { h: HSeg[]; v: VSeg[] } {
  const h: HSeg[] = [];
  const v: VSeg[] = [];
  const pts = w.points;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const x1 = pts[i];
    const y1 = pts[i + 1];
    const x2 = pts[i + 2];
    const y2 = pts[i + 3];
    if (y1 === y2) {
      h.push({
        y: y1,
        x1: Math.min(x1, x2),
        x2: Math.max(x1, x2),
        wireId: w.id,
        i,
      });
    } else if (x1 === x2) {
      v.push({
        x: x1,
        y1: Math.min(y1, y2),
        y2: Math.max(y1, y2),
        wireId: w.id,
        i,
      });
    }
  }
  return { h, v };
}

function hvIntersect(
  hs: HSeg,
  vs: VSeg
): { x: number; y: number } | null {
  const y = hs.y;
  const x = vs.x;
  if (y < vs.y1 || y > vs.y2) return null;
  if (x < hs.x1 || x > hs.x2) return null;
  return { x, y };
}

export function worldSnapRadius(zoom: number, screenPx = 14): number {
  return screenPx / Math.max(zoom, 0.05);
}

/** Project world point onto the infinite line of the current ortho leg. */
function projectOntoOrthoLeg(
  wx: number,
  wy: number,
  lastX: number,
  lastY: number,
  wireOrientation: 'h' | 'v'
): { x: number; y: number } {
  if (wireOrientation === 'h') return { x: wx, y: lastY };
  return { x: lastX, y: wy };
}

function betterCandidate(
  a: WireSnapResult,
  b: WireSnapResult
): WireSnapResult {
  if (a.distance + 1e-9 < b.distance) return a;
  if (b.distance + 1e-9 < a.distance) return b;
  return SNAP_PRIORITY[a.kind] <= SNAP_PRIORITY[b.kind] ? a : b;
}

function eachTerminal(
  circuit: Circuit,
  visit: (x: number, y: number, compId: string, pointId: string) => void
) {
  for (const c of circuit.components) {
    for (const p of c.connectionPoints) {
      const w = connectionPointWorld(c, p);
      visit(w.x, w.y, c.id, p.id);
    }
  }
}

/**
 * Snap point for in-progress orthogonal wiring.
 * Object snap modes (see `WireObjectSnapModes`): connection (terminals),
 * endpoint (wire vertices), midpoint, intersection — each can be toggled
 * independently when the object snap master is on. Grid is separate.
 * Ctrl temporarily disables object + grid snaps.
 * `useOrthoLeg` is false for free-angle wiring unless Shift forces ortho.
 */
export function resolveWireDrawSnap(
  input: WireSnapResolveInput
): { x: number; y: number; snap: WireSnapResult | null } {
  const {
    pointerWorld,
    wirePoints,
    wireOrientation,
    circuit,
    zoom,
    objectSnapEnabled,
    snapModes,
    gridSnapEnabled,
    ctrlHeld,
    useOrthoLeg,
    hoveredTerminalWorld,
  } = input;

  const objectSnapActive =
    objectSnapEnabled &&
    (snapModes.connection ||
      snapModes.endpoint ||
      snapModes.midpoint ||
      snapModes.intersection);

  /** Hover dock to terminal when connection snap is allowed. */
  if (
    hoveredTerminalWorld &&
    !ctrlHeld &&
    objectSnapEnabled &&
    snapModes.connection
  ) {
    const snap: WireSnapResult = {
      kind: 'terminal',
      x: hoveredTerminalWorld.x,
      y: hoveredTerminalWorld.y,
      distance: 0,
      label: SNAP_LABEL.terminal,
    };
    return { x: snap.x, y: snap.y, snap };
  }

  const C = useOrthoLeg
    ? orthoProjectForWireLeg(
        pointerWorld.x,
        pointerWorld.y,
        wirePoints,
        wireOrientation
      )
    : { x: pointerWorld.x, y: pointerWorld.y };

  if (ctrlHeld || (!objectSnapActive && !gridSnapEnabled)) {
    return {
      x: C.x,
      y: C.y,
      snap: null,
    };
  }

  const maxD = worldSnapRadius(zoom);
  let best: WireSnapResult | null = null;

  const consider = (cand: Omit<WireSnapResult, 'label'> & { kind: WireSnapKind }) => {
    const full: WireSnapResult = {
      ...cand,
      label: SNAP_LABEL[cand.kind],
    };
    best = best ? betterCandidate(best, full) : full;
  };

  const lastX = wirePoints[wirePoints.length - 2];
  const lastY = wirePoints[wirePoints.length - 1];

  const considerOnLeg = (
    kind: WireSnapKind,
    worldX: number,
    worldY: number,
    extras: Partial<WireSnapResult> = {}
  ) => {
    const proj = projectOntoOrthoLeg(
      worldX,
      worldY,
      lastX,
      lastY,
      wireOrientation
    );
    const perp = distance(worldX, worldY, proj.x, proj.y);
    if (perp > maxD) return;
    const along = distance(C.x, C.y, proj.x, proj.y);
    if (along > maxD) return;
    consider({
      kind,
      x: proj.x,
      y: proj.y,
      distance: along,
      ...extras,
    });
  };

  const considerNear = (
    kind: WireSnapKind,
    wx: number,
    wy: number,
    extras: Partial<WireSnapResult> = {}
  ) => {
    const d = distance(C.x, C.y, wx, wy);
    if (d > maxD) return;
    consider({
      kind,
      x: wx,
      y: wy,
      distance: d,
      ...extras,
    });
  };

  const considerObj = (
    kind: WireSnapKind,
    wx: number,
    wy: number,
    extras?: Partial<WireSnapResult>
  ) => {
    if (useOrthoLeg) considerOnLeg(kind, wx, wy, extras);
    else considerNear(kind, wx, wy, extras);
  };

  if (objectSnapActive) {
    if (snapModes.connection) {
      eachTerminal(circuit, (x, y, componentId, pointId) => {
        considerObj('terminal', x, y, { componentId, pointId });
      });
    }

    if (snapModes.endpoint || snapModes.midpoint) {
      for (const w of circuit.wires) {
        const pts = w.points;
        if (snapModes.endpoint) {
          for (let i = 0; i < pts.length; i += 2) {
            const x = pts[i];
            const y = pts[i + 1];
            considerObj('wire_endpoint', x, y, { wireId: w.id });
          }
        }
        if (snapModes.midpoint) {
          for (let i = 0; i + 3 < pts.length; i += 2) {
            const x1 = pts[i];
            const y1 = pts[i + 1];
            const x2 = pts[i + 2];
            const y2 = pts[i + 3];
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            considerObj('wire_midpoint', mx, my, { wireId: w.id });
          }
        }
      }
    }

    if (snapModes.intersection) {
      const hSegs: HSeg[] = [];
      const vSegs: VSeg[] = [];
      for (const w of circuit.wires) {
        const { h, v } = axisAlignedSegments(w);
        hSegs.push(...h);
        vSegs.push(...v);
      }
      for (const hs of hSegs) {
        for (const vs of vSegs) {
          if (hs.wireId === vs.wireId && Math.abs(hs.i - vs.i) <= 2) {
            continue;
          }
          const p = hvIntersect(hs, vs);
          if (!p) continue;
          considerObj('wire_intersection', p.x, p.y);
        }
      }
    }
  }

  if (gridSnapEnabled) {
    if (useOrthoLeg) {
      const gx =
        wireOrientation === 'h'
          ? snapToGrid(C.x, circuit.gridSize)
          : lastX;
      const gy =
        wireOrientation === 'v'
          ? snapToGrid(C.y, circuit.gridSize)
          : lastY;
      const d = distance(gx, gy, C.x, C.y);
      if (d <= maxD) {
        consider({ kind: 'grid', x: gx, y: gy, distance: d });
      }
    } else {
      const gx = snapToGrid(C.x, circuit.gridSize);
      const gy = snapToGrid(C.y, circuit.gridSize);
      const d = distance(gx, gy, C.x, C.y);
      if (d <= maxD) {
        consider({ kind: 'grid', x: gx, y: gy, distance: d });
      }
    }
  }

  if (!best) {
    return { x: C.x, y: C.y, snap: null };
  }

  const snap = best as WireSnapResult;
  return { x: snap.x, y: snap.y, snap };
}

/**
 * Same as {@link resolveWireDrawSnap} — name used in wiring-tool specs
 * (“find nearest snap target” for the current pointer / ortho leg).
 */
export const findNearestWireSnapTarget = resolveWireDrawSnap;
