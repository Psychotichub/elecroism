import type { Circuit, Wire } from '../types';
import { connectionPointWorld, snapToGrid } from './geometry';
import { worldSnapRadius } from './wireSnap';

export function findNearestTerminal(
  circuit: Circuit,
  wx: number,
  wy: number,
  maxDist: number,
  exclude?: { componentId: string; pointId: string }
): { componentId: string; pointId: string; x: number; y: number } | null {
  let best: {
    componentId: string;
    pointId: string;
    x: number;
    y: number;
    d: number;
  } | null = null;
  for (const c of circuit.components) {
    for (const p of c.connectionPoints) {
      if (
        exclude &&
        c.id === exclude.componentId &&
        p.id === exclude.pointId
      ) {
        continue;
      }
      const w = connectionPointWorld(c, p);
      const d = Math.hypot(w.x - wx, w.y - wy);
      if (d > maxDist) continue;
      if (!best || d < best.d) {
        best = {
          componentId: c.id,
          pointId: p.id,
          x: w.x,
          y: w.y,
          d,
        };
      }
    }
  }
  if (!best) return null;
  return {
    componentId: best.componentId,
    pointId: best.pointId,
    x: best.x,
    y: best.y,
  };
}

function terminalWorldByIds(
  circuit: Circuit,
  compId: string,
  pointId: string
): { x: number; y: number } | null {
  const comp = circuit.components.find((c) => c.id === compId);
  const cp = comp?.connectionPoints.find((p) => p.id === pointId);
  if (!comp || !cp) return null;
  return connectionPointWorld(comp, cp);
}

/**
 * After a grip drag, optionally reconnect endpoints to nearby terminals,
 * revert unsnapped endpoint moves to the logical terminal position, apply
 * grid snap, then let `syncWireEndpoints` align stored endpoints.
 */
export function finalizeWirePolylineForCommit(
  circuit: Circuit,
  wire: Wire,
  opts: {
    draggedVertexIndex: number | null;
    gridSnapEnabled: boolean;
    gridSize: number;
    zoom: number;
  }
): Wire {
  let w = { ...wire, points: [...wire.points] };
  const n = w.points.length / 2;
  const maxD = worldSnapRadius(opts.zoom);
  const { draggedVertexIndex, gridSnapEnabled, gridSize } = opts;

  if (draggedVertexIndex === 0) {
    const hit = findNearestTerminal(
      circuit,
      w.points[0],
      w.points[1],
      maxD,
      { componentId: w.toComponentId, pointId: w.toPointId }
    );
    if (hit) {
      w = {
        ...w,
        fromComponentId: hit.componentId,
        fromPointId: hit.pointId,
      };
    } else {
      const pos = terminalWorldByIds(
        circuit,
        w.fromComponentId,
        w.fromPointId
      );
      if (pos) {
        w.points[0] = pos.x;
        w.points[1] = pos.y;
      }
    }
  } else if (draggedVertexIndex === n - 1 && n > 0) {
    const hit = findNearestTerminal(
      circuit,
      w.points[w.points.length - 2],
      w.points[w.points.length - 1],
      maxD,
      { componentId: w.fromComponentId, pointId: w.fromPointId }
    );
    if (hit) {
      w = {
        ...w,
        toComponentId: hit.componentId,
        toPointId: hit.pointId,
      };
    } else {
      const pos = terminalWorldByIds(
        circuit,
        w.toComponentId,
        w.toPointId
      );
      if (pos) {
        w.points[w.points.length - 2] = pos.x;
        w.points[w.points.length - 1] = pos.y;
      }
    }
  }

  if (gridSnapEnabled) {
    for (let i = 0; i < w.points.length; i += 2) {
      w.points[i] = snapToGrid(w.points[i], gridSize);
      w.points[i + 1] = snapToGrid(w.points[i + 1], gridSize);
    }
  }

  return w;
}

export function insertVertexOnWireSegment(
  points: number[],
  segmentIndex: number,
  wx: number,
  wy: number
): number[] | null {
  const n = points.length / 2;
  if (segmentIndex < 0 || segmentIndex >= n - 1) return null;
  const x0 = points[segmentIndex * 2];
  const y0 = points[segmentIndex * 2 + 1];
  const x1 = points[(segmentIndex + 1) * 2];
  const y1 = points[(segmentIndex + 1) * 2 + 1];
  const horizontal = Math.abs(y1 - y0) < 1e-6;
  const vertical = Math.abs(x1 - x0) < 1e-6;
  let ix: number;
  let iy: number;
  if (horizontal && !vertical) {
    ix = wx;
    iy = y0;
  } else if (vertical && !horizontal) {
    ix = x0;
    iy = wy;
  } else {
    const abx = x1 - x0;
    const aby = y1 - y0;
    const len2 = abx * abx + aby * aby;
    if (len2 < 1e-12) return null;
    let t = ((wx - x0) * abx + (wy - y0) * aby) / len2;
    t = Math.max(0, Math.min(1, t));
    ix = x0 + t * abx;
    iy = y0 + t * aby;
  }
  const out = [...points];
  out.splice((segmentIndex + 1) * 2, 0, ix, iy);
  return out;
}

export function removeInteriorWireVertex(
  points: number[],
  vertexIndex: number
): number[] | null {
  const n = points.length / 2;
  if (vertexIndex <= 0 || vertexIndex >= n - 1) return null;
  if (n <= 2) return null;
  const out = [...points];
  out.splice(vertexIndex * 2, 2);
  return out;
}

export function translateWireSegment(
  points: number[],
  segmentIndex: number,
  dx: number,
  dy: number
): number[] | null {
  const n = points.length / 2;
  if (segmentIndex < 0 || segmentIndex >= n - 1) return null;
  const x0 = points[segmentIndex * 2];
  const y0 = points[segmentIndex * 2 + 1];
  const x1 = points[(segmentIndex + 1) * 2];
  const y1 = points[(segmentIndex + 1) * 2 + 1];
  const horizontal = Math.abs(y1 - y0) < 1e-6;
  const vertical = Math.abs(x1 - x0) < 1e-6;
  const out = [...points];
  if (horizontal && !vertical) {
    out[segmentIndex * 2 + 1] += dy;
    out[(segmentIndex + 1) * 2 + 1] += dy;
  } else if (vertical && !horizontal) {
    out[segmentIndex * 2] += dx;
    out[(segmentIndex + 1) * 2] += dx;
  } else {
    out[segmentIndex * 2] += dx;
    out[segmentIndex * 2 + 1] += dy;
    out[(segmentIndex + 1) * 2] += dx;
    out[(segmentIndex + 1) * 2 + 1] += dy;
  }
  return out;
}
