import type { CircuitComponent } from '../types';
import { orthogonalLeg } from './geometry';
import { worldSnapRadius } from './wireSnap';

function projectPointOnSegment(
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

/** Clamp so each side of the split keeps a visible stub (avoids degenerate wires). */
export function clampTeeSplitParameter(t: number): number {
  return Math.max(0.04, Math.min(0.96, t));
}

/** Squared perpendicular distance from a click to a polyline segment (world space). */
export function distanceSqToWireSegment(
  points: number[],
  segmentIndex: number,
  cx: number,
  cy: number
): number | null {
  const si = segmentIndex * 2;
  if (si < 0 || si + 3 >= points.length) return null;
  const x0 = points[si];
  const y0 = points[si + 1];
  const x1 = points[si + 2];
  const y1 = points[si + 3];
  return projectPointOnSegment(x0, y0, x1, y1, cx, cy).distSq;
}

export function splitPolylineAtPoint(
  points: number[],
  segmentIndex: number,
  sx: number,
  sy: number
): { left: number[]; right: number[] } | null {
  const n = points.length / 2;
  if (segmentIndex < 0 || segmentIndex >= n - 1) return null;

  const eps = 1e-3;
  const left: number[] = [];
  for (let i = 0; i <= segmentIndex; i++) {
    left.push(points[i * 2], points[i * 2 + 1]);
  }
  const lx = left[left.length - 2];
  const ly = left[left.length - 1];
  if ((lx - sx) ** 2 + (ly - sy) ** 2 > eps * eps) {
    left.push(sx, sy);
  }

  const right: number[] = [];
  const px1 = points[(segmentIndex + 1) * 2];
  const py1 = points[(segmentIndex + 1) * 2 + 1];
  if ((px1 - sx) ** 2 + (py1 - sy) ** 2 > eps * eps) {
    right.push(sx, sy);
  }
  for (let i = segmentIndex + 1; i < n; i++) {
    right.push(points[i * 2], points[i * 2 + 1]);
  }

  if (left.length < 4 || right.length < 4) return null;
  return { left, right };
}

export function connectionPointIdByLabel(
  comp: CircuitComponent,
  label: string
): string | undefined {
  return comp.connectionPoints.find((cp) => cp.label === label)?.id;
}

/** Snap click onto segment interior with stable stub lengths for both sides. */
export function resolveSplitPointOnSegment(
  points: number[],
  segmentIndex: number,
  clickX: number,
  clickY: number
): { sx: number; sy: number } | null {
  const si = segmentIndex;
  if (si < 0 || si * 2 + 3 >= points.length) return null;
  const x0 = points[si * 2];
  const y0 = points[si * 2 + 1];
  const x1 = points[si * 2 + 2];
  const y1 = points[si * 2 + 3];
  const p = projectPointOnSegment(x0, y0, x1, y1, clickX, clickY);
  const t = clampTeeSplitParameter(p.t);
  const sx = x0 + t * (x1 - x0);
  const sy = y0 + t * (y1 - y0);
  return { sx, sy };
}

export function buildBranchPolylineToPoint(
  draftPoints: number[],
  targetX: number,
  targetY: number
): number[] {
  if (draftPoints.length < 2) {
    return [...draftPoints, targetX, targetY];
  }
  const lastX = draftPoints[draftPoints.length - 2];
  const lastY = draftPoints[draftPoints.length - 1];
  const firstAxis: 'h' | 'v' =
    Math.abs(targetX - lastX) >= Math.abs(targetY - lastY) ? 'h' : 'v';
  const tail = orthogonalLeg(lastX, lastY, targetX, targetY, firstAxis);
  return [...draftPoints, ...tail];
}

export function teeHitToleranceWorld(zoom: number): number {
  return worldSnapRadius(zoom, 16);
}
