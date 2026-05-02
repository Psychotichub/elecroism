import type { Circuit, Wire } from '../types';
import { orthogonalLeg } from './geometry';
import { worldSnapRadius } from './wireSnap';

/** Manhattan collinear (shared horizontal or vertical line). */
export function isOrthoCollinearTriple(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number
): boolean {
  const onX = bx === ax && bx === cx;
  const onY = by === ay && by === cy;
  return onX || onY;
}

export function removeCollinearInteriorVertices(points: number[]): number[] {
  const pts = [...points];
  let changed = true;
  while (changed) {
    changed = false;
    const n = pts.length / 2;
    if (n < 3) break;
    for (let i = 1; i < n - 1; i++) {
      const ax = pts[(i - 1) * 2];
      const ay = pts[(i - 1) * 2 + 1];
      const bx = pts[i * 2];
      const by = pts[i * 2 + 1];
      const cx = pts[(i + 1) * 2];
      const cy = pts[(i + 1) * 2 + 1];
      if (isOrthoCollinearTriple(ax, ay, bx, by, cx, cy)) {
        pts.splice(i * 2, 2);
        changed = true;
        break;
      }
    }
  }
  return pts;
}

export function concatDedupeWorld(a: number[], b: number[]): number[] {
  if (a.length < 2) return [...b];
  if (b.length < 2) return [...a];
  const lx = a[a.length - 2];
  const ly = a[a.length - 1];
  if (lx === b[0] && ly === b[1]) {
    return [...a, ...b.slice(2)];
  }
  return [...a, ...b];
}

/**
 * Replace the subpath between vertex indices `lo` and `hi` (inclusive of both)
 * with an orthogonal Manhattan route between those two points.
 */
export function trimWireBetweenVertexIndices(
  points: number[],
  lo: number,
  hi: number
): number[] | null {
  const n = points.length / 2;
  if (lo < 0 || hi < 0 || lo >= n || hi >= n || lo === hi) return null;
  const i0 = Math.min(lo, hi);
  const i1 = Math.max(lo, hi);
  if (i1 - i0 < 1) return null;
  const ax = points[i0 * 2];
  const ay = points[i0 * 2 + 1];
  const bx = points[i1 * 2];
  const by = points[i1 * 2 + 1];
  const firstAxis: 'h' | 'v' =
    Math.abs(bx - ax) >= Math.abs(by - ay) ? 'h' : 'v';
  const mid = orthogonalLeg(ax, ay, bx, by, firstAxis);
  const head = points.slice(0, (i0 + 1) * 2);
  const tail = points.slice(i1 * 2);
  const merged = concatDedupeWorld(concatDedupeWorld(head, mid), tail);
  if (merged.length < 4) return null;
  return merged;
}

export type WireSegmentHit = {
  wireId: string;
  segmentIndex: number;
  projX: number;
  projY: number;
  distSq: number;
};

function projectOnSegment(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  px: number,
  py: number
): { x: number; y: number; t: number; distSq: number } {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 < 1e-12) {
    const d2 = (px - ax) ** 2 + (py - ay) ** 2;
    return { x: ax, y: ay, t: 0, distSq: d2 };
  }
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  const x = ax + t * abx;
  const y = ay + t * aby;
  const d2 = (px - x) ** 2 + (py - y) ** 2;
  return { x, y, t, distSq: d2 };
}

/** Closest axis-aligned segment on any wire (excluding optional wire id). */
export function reverseWireEndpoints(w: Wire): Wire {
  const pts = w.points;
  const rev: number[] = [];
  for (let i = pts.length - 2; i >= 0; i -= 2) {
    rev.push(pts[i], pts[i + 1]);
  }
  return {
    ...w,
    fromComponentId: w.toComponentId,
    fromPointId: w.toPointId,
    toComponentId: w.fromComponentId,
    toPointId: w.fromPointId,
    points: rev,
  };
}

export function tryMergeWirePairAtJunction(
  w1: Wire,
  w2: Wire,
  junctionId: string,
  newWireId: string
): Wire | null {
  const opts = [
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ] as const;
  for (const [r1, r2] of opts) {
    const a = r1 ? reverseWireEndpoints(w1) : w1;
    const b = r2 ? reverseWireEndpoints(w2) : w2;
    if (a.toComponentId !== junctionId || b.fromComponentId !== junctionId) {
      continue;
    }
    const pts = concatDedupeWorld(a.points, b.points);
    if (pts.length < 4) continue;
    return {
      ...a,
      id: newWireId,
      toComponentId: b.toComponentId,
      toPointId: b.toPointId,
      points: pts,
      wireCategory: a.wireCategory ?? b.wireCategory,
      wireProtocol: a.wireProtocol ?? b.wireProtocol ?? 'none',
      crossSection: Math.max(a.crossSection, b.crossSection),
    };
  }
  return null;
}

export function findClosestSegmentIndexOnWire(
  wire: Wire,
  worldX: number,
  worldY: number,
  zoom: number
): number {
  const pts = wire.points;
  const n = pts.length / 2;
  const maxD2 = worldSnapRadius(zoom, 14) ** 2;
  let bestSi = 0;
  let bestD2 = Infinity;
  for (let si = 0; si < n - 1; si++) {
    const ax = pts[si * 2];
    const ay = pts[si * 2 + 1];
    const bx = pts[(si + 1) * 2];
    const by = pts[(si + 1) * 2 + 1];
    const horiz = Math.abs(by - ay) < 1e-6;
    const vert = Math.abs(bx - ax) < 1e-6;
    if (!horiz && !vert) continue;
    const p = projectOnSegment(ax, ay, bx, by, worldX, worldY);
    if (p.distSq < bestD2) {
      bestD2 = p.distSq;
      bestSi = si;
    }
  }
  if (bestD2 > maxD2) return -1;
  return bestSi;
}

export function hitTestClosestWireSegment(
  circuit: Circuit,
  worldX: number,
  worldY: number,
  opts?: { excludeWireId?: string; zoom: number }
): WireSegmentHit | null {
  const tolPx = 14;
  const zoom = opts?.zoom ?? circuit.zoom;
  const maxD2 = (worldSnapRadius(zoom, tolPx)) ** 2;
  let best: WireSegmentHit | null = null;
  for (const w of circuit.wires) {
    if (w.id === opts?.excludeWireId) continue;
    const pts = w.points;
    const nv = pts.length / 2;
    for (let si = 0; si < nv - 1; si++) {
      const ax = pts[si * 2];
      const ay = pts[si * 2 + 1];
      const bx = pts[(si + 1) * 2];
      const by = pts[(si + 1) * 2 + 1];
      const horiz = Math.abs(by - ay) < 1e-6;
      const vert = Math.abs(bx - ax) < 1e-6;
      if (!horiz && !vert) continue;
      const p = projectOnSegment(ax, ay, bx, by, worldX, worldY);
      if (p.distSq > maxD2) continue;
      if (!best || p.distSq < best.distSq) {
        best = {
          wireId: w.id,
          segmentIndex: si,
          projX: p.x,
          projY: p.y,
          distSq: p.distSq,
        };
      }
    }
  }
  return best;
}

/** Ray axis-aligned from (ox,oy) along (dirx,diry); first hit on finite HV segment, t > tMin. */
export function rayHitAxisAlignedSegment(
  ox: number,
  oy: number,
  dirx: number,
  diry: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  tMin: number
): { t: number; x: number; y: number } | null {
  const horiz = Math.abs(by - ay) < 1e-6;
  const vert = Math.abs(bx - ax) < 1e-6;
  if (!horiz && !vert) return null;

  if (Math.abs(diry) < 1e-9 && Math.abs(dirx) > 1e-9) {
    if (!vert) return null;
    const xs = ax;
    const t = (xs - ox) / dirx;
    if (t <= tMin) return null;
    const yhit = oy;
    const ymin = Math.min(ay, by);
    const ymax = Math.max(ay, by);
    if (yhit < ymin - 1e-6 || yhit > ymax + 1e-6) return null;
    const xhit = ox + t * dirx;
    const sxmin = Math.min(ax, bx) - 1e-6;
    const sxmax = Math.max(ax, bx) + 1e-6;
    if (xhit < sxmin || xhit > sxmax) return null;
    return { t, x: xhit, y: yhit };
  }
  if (Math.abs(dirx) < 1e-9 && Math.abs(diry) > 1e-9) {
    if (!horiz) return null;
    const ys = ay;
    const t = (ys - oy) / diry;
    if (t <= tMin) return null;
    const xhit = ox;
    const xmin = Math.min(ax, bx);
    const xmax = Math.max(ax, bx);
    if (xhit < xmin - 1e-6 || xhit > xmax + 1e-6) return null;
    const yhit = oy + t * diry;
    const symin = Math.min(ay, by) - 1e-6;
    const symax = Math.max(ay, by) + 1e-6;
    if (yhit < symin || yhit > symax) return null;
    return { t, x: xhit, y: yhit };
  }
  return null;
}

/**
 * Extend the first interior bend (vertex 1) along the ray from terminal V0
 * through V1 until the first axis-aligned hit on `cutter` segments (skips
 * the first cutter segments when `cutter` is the same wire as `wire`).
 */
export function extendWireFromStartTowardHit(
  wire: Wire,
  cutter: Wire
): { points: number[] } | null {
  const pts = wire.points;
  if (pts.length < 6) return null;
  const ox = pts[0];
  const oy = pts[1];
  const vx = pts[2];
  const vy = pts[3];
  const dx = vx - ox;
  const dy = vy - oy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return null;
  const udx = dx / len;
  const udy = dy / len;
  const rayOx = vx;
  const rayOy = vy;
  let best: { t: number; x: number; y: number } | null = null;
  const cpts = cutter.points;
  const cn = cpts.length / 2;
  for (let si = 0; si < cn - 1; si++) {
    if (cutter.id === wire.id && (si === 0 || si === 1)) continue;
    const ax = cpts[si * 2];
    const ay = cpts[si * 2 + 1];
    const bx = cpts[(si + 1) * 2];
    const by = cpts[(si + 1) * 2 + 1];
    const hit = rayHitAxisAlignedSegment(
      rayOx,
      rayOy,
      udx,
      udy,
      ax,
      ay,
      bx,
      by,
      1e-3
    );
    if (!hit) continue;
    if (!best || hit.t < best.t) best = hit;
  }
  if (!best) return null;
  const nx = best.x;
  const ny = best.y;
  if ((nx - vx) ** 2 + (ny - vy) ** 2 < 1e-6) return null;
  const next = [...pts];
  next[2] = nx;
  next[3] = ny;
  return { points: next };
}

/** Same as extend from start but from the `to` terminal inward (vertex n-2). */
export function extendWireFromEndTowardHit(
  wire: Wire,
  cutter: Wire
): { points: number[] } | null {
  const pts = wire.points;
  const n = pts.length / 2;
  if (n < 3) return null;
  const ox = pts[(n - 1) * 2];
  const oy = pts[(n - 1) * 2 + 1];
  const vx = pts[(n - 2) * 2];
  const vy = pts[(n - 2) * 2 + 1];
  const dx = vx - ox;
  const dy = vy - oy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return null;
  const udx = -dx / len;
  const udy = -dy / len;
  const rayOx = vx;
  const rayOy = vy;
  let best: { t: number; x: number; y: number } | null = null;
  const cpts = cutter.points;
  const cn = cpts.length / 2;
  for (let si = 0; si < cn - 1; si++) {
    if (cutter.id === wire.id && si >= n - 3 && si <= n - 2) continue;
    const ax = cpts[si * 2];
    const ay = cpts[si * 2 + 1];
    const bx = cpts[(si + 1) * 2];
    const by = cpts[(si + 1) * 2 + 1];
    const hit = rayHitAxisAlignedSegment(
      rayOx,
      rayOy,
      udx,
      udy,
      ax,
      ay,
      bx,
      by,
      1e-3
    );
    if (!hit) continue;
    if (!best || hit.t < best.t) best = hit;
  }
  if (!best) return null;
  const nx = best.x;
  const ny = best.y;
  if ((nx - vx) ** 2 + (ny - vy) ** 2 < 1e-6) return null;
  const next = [...pts];
  next[(n - 2) * 2] = nx;
  next[(n - 2) * 2 + 1] = ny;
  return { points: next };
}
