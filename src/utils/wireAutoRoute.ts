import type { Circuit, CircuitComponent } from '../types';
import {
  connectionPointWorld,
  orthogonalLeg,
  snapToGrid,
} from './geometry';

export type WireObstacleRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Axis-aligned bounding boxes around symbols (for simple clearance checks). */
export function buildWireObstacleRects(
  circuit: Circuit,
  excludeComponentIds: Set<string>
): WireObstacleRect[] {
  const pad = 10;
  return circuit.components
    .filter((c) => !excludeComponentIds.has(c.id))
    .map((c) => boundsForComponent(c, pad));
}

function boundsForComponent(
  c: CircuitComponent,
  pad: number
): WireObstacleRect {
  if (c.connectionPoints.length === 0) {
    return { x: c.x - 24 - pad, y: c.y - 24 - pad, w: 48 + pad * 2, h: 48 + pad * 2 };
  }
  const xs = c.connectionPoints.map((cp) => connectionPointWorld(c, cp).x);
  const ys = c.connectionPoints.map((cp) => connectionPointWorld(c, cp).y);
  const x1 = Math.min(...xs) - pad;
  const y1 = Math.min(...ys) - pad;
  const x2 = Math.max(...xs) + pad;
  const y2 = Math.max(...ys) + pad;
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

function horizSegHitsRect(
  y: number,
  x0: number,
  x1: number,
  r: WireObstacleRect
): boolean {
  const xa = Math.min(x0, x1);
  const xb = Math.max(x0, x1);
  if (y < r.y || y > r.y + r.h) return false;
  if (xb < r.x || xa > r.x + r.w) return false;
  return true;
}

function vertSegHitsRect(
  x: number,
  y0: number,
  y1: number,
  r: WireObstacleRect
): boolean {
  const ya = Math.min(y0, y1);
  const yb = Math.max(y0, y1);
  if (x < r.x || x > r.x + r.w) return false;
  if (yb < r.y || ya > r.y + r.h) return false;
  return true;
}

function segmentHitsRects(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rects: WireObstacleRect[]
): boolean {
  const horiz = y1 === y2;
  for (const r of rects) {
    if (horiz) {
      if (horizSegHitsRect(y1, x1, x2, r)) return true;
    } else if (x1 === x2) {
      if (vertSegHitsRect(x1, y1, y2, r)) return true;
    }
  }
  return false;
}

function pathHitsObstacles(
  flat: number[],
  rects: WireObstacleRect[]
): boolean {
  for (let i = 0; i + 3 < flat.length; i += 2) {
    const x1 = flat[i];
    const y1 = flat[i + 1];
    const x2 = flat[i + 2];
    const y2 = flat[i + 3];
    if (segmentHitsRects(x1, y1, x2, y2, rects)) return true;
  }
  return false;
}

function manhattanLength(flat: number[]): number {
  let sum = 0;
  for (let i = 0; i + 3 < flat.length; i += 2) {
    sum +=
      Math.abs(flat[i + 2] - flat[i]) + Math.abs(flat[i + 3] - flat[i + 1]);
  }
  return sum;
}

/** Remove consecutive duplicate vertices. */
export function dedupeWirePoints(flat: number[]): number[] {
  if (flat.length < 4) return flat.slice();
  const out: number[] = [flat[0], flat[1]];
  for (let i = 2; i < flat.length; i += 2) {
    const x = flat[i];
    const y = flat[i + 1];
    const px = out[out.length - 2];
    const py = out[out.length - 1];
    if (x !== px || y !== py) {
      out.push(x, y);
    }
  }
  return out;
}

/**
 * Orthogonal auto-route between two terminals (no user polyline).
 * Tries L-routes compatible with terminal outward axes, then Z-routes when
 * both ends share the same outward axis, then `orthogonalLeg` fallbacks.
 */
export function routeWireBetweenTerminals(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  startOutward: 'h' | 'v',
  endOutward: 'h' | 'v',
  obstacles: WireObstacleRect[],
  gridSize: number
): number[] {
  const candidates: number[][] = [];

  const pushL = (pts: number[]) => {
    const d = dedupeWirePoints(pts);
    if (d.length >= 4) candidates.push(d);
  };

  // Degenerate axis-aligned
  if (sx === ex) {
    const v = dedupeWirePoints([sx, sy, ex, ey]);
    if (v.length >= 4) candidates.push(v);
  }
  if (sy === ey) {
    const h = dedupeWirePoints([sx, sy, ex, ey]);
    if (h.length >= 4) candidates.push(h);
  }

  // L: horizontal exit from start, vertical into end (end outward v)
  if (endOutward === 'v') {
    pushL([sx, sy, ex, sy, ex, ey]);
  }
  // L: vertical exit, horizontal into end (end outward h)
  if (endOutward === 'h') {
    pushL([sx, sy, sx, ey, ex, ey]);
  }

  // Z when both want horizontal first and last horizontal (h–h)
  if (startOutward === 'h' && endOutward === 'h' && (sx !== ex || sy !== ey)) {
    const midBase = (sx + ex) / 2;
    const offsets = [0, gridSize, -gridSize, 2 * gridSize, -2 * gridSize];
    for (const off of offsets) {
      let mx = snapToGrid(midBase + off, gridSize);
      if (Math.abs(mx - sx) < 1e-6 || Math.abs(mx - ex) < 1e-6) {
        mx = snapToGrid(midBase + (off === 0 ? gridSize : off), gridSize);
      }
      pushL([sx, sy, mx, sy, mx, ey, ex, ey]);
    }
  }

  // Z when both vertical (v–v)
  if (startOutward === 'v' && endOutward === 'v' && (sx !== ex || sy !== ey)) {
    const midBase = (sy + ey) / 2;
    const offsets = [0, gridSize, -gridSize, 2 * gridSize, -2 * gridSize];
    for (const off of offsets) {
      let my = snapToGrid(midBase + off, gridSize);
      if (Math.abs(my - sy) < 1e-6 || Math.abs(my - ey) < 1e-6) {
        my = snapToGrid(midBase + (off === 0 ? gridSize : off), gridSize);
      }
      pushL([sx, sy, sx, my, ex, my, ex, ey]);
    }
  }

  // orthogonalLeg from start (two-bend max from util)
  for (const first of ['h', 'v'] as const) {
    const leg = orthogonalLeg(sx, sy, ex, ey, first);
    if (leg.length >= 2) {
      const full = dedupeWirePoints([sx, sy, ...leg]);
      if (full.length >= 4) candidates.push(full);
    }
  }

  const uniq = candidates.filter(
    (p, i) =>
      candidates.findIndex(
        (q) =>
          q.length === p.length &&
          q.every((v, j) => Math.abs(v - p[j]) < 1e-9)
      ) === i
  );

  const scored = uniq.map((p) => ({
    p,
    hits: pathHitsObstacles(p, obstacles),
    len: manhattanLength(p),
  }));

  const free = scored.filter((s) => !s.hits);
  if (free.length > 0) {
    free.sort((a, b) => a.len - b.len);
    return free[0].p;
  }

  const astar = astarOrthogonalRoute(sx, sy, ex, ey, obstacles, gridSize);
  if (astar && astar.length >= 4 && !pathHitsObstacles(astar, obstacles)) {
    return astar;
  }

  const pool = scored;
  pool.sort((a, b) => a.len - b.len);
  const best = pool[0];
  if (best && best.p.length >= 4) return best.p;
  if (astar && astar.length >= 4) return astar;
  const fb = dedupeWirePoints([
    sx,
    sy,
    ...orthogonalLeg(sx, sy, ex, ey, startOutward),
  ]);
  if (fb.length >= 4) return fb;
  const fb2 = dedupeWirePoints([
    sx,
    sy,
    ...orthogonalLeg(sx, sy, ex, ey, startOutward === 'h' ? 'v' : 'h'),
  ]);
  return fb2.length >= 4 ? fb2 : fb;
}

type GridNode = { gx: number; gy: number };

function cellBlocked(
  wx: number,
  wy: number,
  rects: WireObstacleRect[]
): boolean {
  for (const r of rects) {
    if (wx >= r.x && wx <= r.x + r.w && wy >= r.y && wy <= r.y + r.h) {
      return true;
    }
  }
  return false;
}

function nodeKey(gx: number, gy: number): string {
  return `${gx},${gy}`;
}

function simplifyOrthogonalPath(flat: number[]): number[] {
  if (flat.length <= 4) return flat;
  const out: number[] = [flat[0], flat[1]];
  for (let i = 2; i < flat.length; i += 2) {
    const x = flat[i];
    const y = flat[i + 1];
    const n = out.length;
    if (n >= 4) {
      const px = out[n - 4];
      const py = out[n - 3];
      const cx = out[n - 2];
      const cy = out[n - 1];
      const collinearH = py === cy && cy === y;
      const collinearV = px === cx && cx === x;
      if (collinearH || collinearV) {
        out[n - 2] = x;
        out[n - 1] = y;
        continue;
      }
    }
    out.push(x, y);
  }
  return dedupeWirePoints(out);
}

/** Grid A* for obstacle-free Manhattan routes when L/Z candidates fail. */
export function astarOrthogonalRoute(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  obstacles: WireObstacleRect[],
  gridSize: number
): number[] | null {
  const step = Math.max(4, gridSize);
  const minX = Math.min(sx, ex) - step * 8;
  const maxX = Math.max(sx, ex) + step * 8;
  const minY = Math.min(sy, ey) - step * 8;
  const maxY = Math.max(sy, ey) + step * 8;

  const toGrid = (v: number, origin: number) =>
    Math.round((v - origin) / step);
  const toWorld = (g: number, origin: number) => origin + g * step;

  const start: GridNode = {
    gx: toGrid(sx, minX),
    gy: toGrid(sy, minY),
  };
  const goal: GridNode = {
    gx: toGrid(ex, minX),
    gy: toGrid(ey, minY),
  };

  const startWx = toWorld(start.gx, minX);
  const startWy = toWorld(start.gy, minY);
  if (cellBlocked(startWx, startWy, obstacles)) return null;

  const open = new Map<string, { node: GridNode; f: number }>();
  const gScore = new Map<string, number>();
  const cameFrom = new Map<string, GridNode>();
  const sk = nodeKey(start.gx, start.gy);
  gScore.set(sk, 0);
  open.set(sk, {
    node: start,
    f: Math.abs(start.gx - goal.gx) + Math.abs(start.gy - goal.gy),
  });

  const neighbors: GridNode[] = [
    { gx: 0, gy: 0 },
    { gx: 1, gy: 0 },
    { gx: -1, gy: 0 },
    { gx: 0, gy: 1 },
    { gx: 0, gy: -1 },
  ];

  let iterations = 0;
  const maxIter = 12000;

  while (open.size > 0 && iterations < maxIter) {
    iterations++;
    let currentKey = '';
    let bestF = Infinity;
    for (const [k, v] of open) {
      if (v.f < bestF) {
        bestF = v.f;
        currentKey = k;
      }
    }
    const current = open.get(currentKey)!.node;
    open.delete(currentKey);

    if (current.gx === goal.gx && current.gy === goal.gy) {
      const nodes: GridNode[] = [current];
      let ck = currentKey;
      while (cameFrom.has(ck)) {
        const prev = cameFrom.get(ck)!;
        nodes.unshift(prev);
        ck = nodeKey(prev.gx, prev.gy);
      }
      const flat: number[] = [sx, sy];
      for (let i = 1; i < nodes.length; i++) {
        flat.push(toWorld(nodes[i].gx, minX), toWorld(nodes[i].gy, minY));
      }
      flat.push(ex, ey);
      return simplifyOrthogonalPath(flat);
    }

    for (const delta of neighbors) {
      if (delta.gx === 0 && delta.gy === 0) continue;
      const next: GridNode = {
        gx: current.gx + delta.gx,
        gy: current.gy + delta.gy,
      };
      const wx = toWorld(next.gx, minX);
      const wy = toWorld(next.gy, minY);
      if (wx < minX || wx > maxX || wy < minY || wy > maxY) continue;
      if (cellBlocked(wx, wy, obstacles)) continue;
      const nk = nodeKey(next.gx, next.gy);
      const tentative =
        (gScore.get(currentKey) ?? Infinity) +
        Math.abs(delta.gx) +
        Math.abs(delta.gy);
      if (tentative >= (gScore.get(nk) ?? Infinity)) continue;
      cameFrom.set(nk, current);
      gScore.set(nk, tentative);
      const h =
        Math.abs(next.gx - goal.gx) + Math.abs(next.gy - goal.gy);
      open.set(nk, { node: next, f: tentative + h });
    }
  }

  return null;
}
