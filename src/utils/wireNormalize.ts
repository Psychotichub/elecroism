import { removeCollinearInteriorVertices } from './wireEditOps';

const DEDUPE_EPS = 1e-6;

function removeDuplicateConsecutiveVertices(points: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    const x = points[i];
    const y = points[i + 1];
    if (out.length >= 2) {
      const lx = out[out.length - 2];
      const ly = out[out.length - 1];
      if (Math.hypot(x - lx, y - ly) < DEDUPE_EPS) continue;
    }
    out.push(x, y);
  }
  return out;
}

/**
 * Snap nearly axis-aligned corners so the bend sits on a straight H/V run
 * (small jog removal).
 */
function straightenNearAxisCorners(points: number[], eps: number): number[] {
  if (points.length < 6) return points;
  const out = points.slice();
  const n = out.length / 2;
  for (let i = 1; i < n - 1; i++) {
    const ax = out[(i - 1) * 2];
    const ay = out[(i - 1) * 2 + 1];
    const bx = out[i * 2];
    const by = out[i * 2 + 1];
    const cx = out[(i + 1) * 2];
    const cy = out[(i + 1) * 2 + 1];
    const dx1 = bx - ax;
    const dy1 = by - ay;
    const dx2 = cx - bx;
    const dy2 = cy - by;
    if (
      Math.abs(dy1) <= eps &&
      Math.abs(dy2) <= eps &&
      Math.abs(dx1) > eps &&
      Math.abs(dx2) > eps
    ) {
      out[i * 2 + 1] = (ay + cy) / 2;
    } else if (
      Math.abs(dx1) <= eps &&
      Math.abs(dx2) <= eps &&
      Math.abs(dy1) > eps &&
      Math.abs(dy2) > eps
    ) {
      out[i * 2] = (ax + cx) / 2;
    }
  }
  return out;
}

function snapVerticesToGrid(points: number[], gridSize: number): number[] {
  const snap = (v: number) => Math.round(v / gridSize) * gridSize;
  const out = points.slice();
  for (let i = 0; i < out.length; i += 2) {
    out[i] = snap(out[i]);
    out[i + 1] = snap(out[i + 1]);
  }
  return out;
}

export type NormalizeWirePointsOptions = {
  /** If set, snap every vertex to this grid after geometry cleanup. */
  alignToGrid?: number;
  /** Max deviation from horizontal/vertical to treat as aligned (world units). */
  nearAxisEps?: number;
};

/**
 * Dedupe consecutive points, straighten tiny axis jog bends, merge orthogonal
 * collinear bends, then optionally snap all vertices to a grid.
 */
export function normalizeWirePoints(
  points: number[],
  opts?: NormalizeWirePointsOptions
): number[] {
  if (points.length < 4) return points.slice();
  const grid = opts?.alignToGrid;
  const eps =
    opts?.nearAxisEps ??
    (grid != null && grid > 0 ? Math.max(1, grid * 0.2) : 2);

  let p = removeDuplicateConsecutiveVertices(points);
  p = straightenNearAxisCorners(p, eps);
  p = removeCollinearInteriorVertices(p);
  if (grid != null && grid > 0) {
    p = snapVerticesToGrid(p, grid);
    p = removeDuplicateConsecutiveVertices(p);
    p = removeCollinearInteriorVertices(p);
  }
  return p;
}
