import type { CircuitComponent, ConnectionPoint } from '../types';

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function rotatePoint(
  cx: number,
  cy: number,
  angle: number
): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  return {
    x: cx * Math.cos(rad) - cy * Math.sin(rad),
    y: cx * Math.sin(rad) + cy * Math.cos(rad),
  };
}

export function getWireColor(color: string): string {
  const colors: Record<string, string> = {
    brown: '#7C3F19',
    blue: '#2563EB',
    green_yellow: '#65A30D',
    black: '#111827',
    grey: '#4B5563',
    red: '#B91C1C',
  };
  return colors[color] || '#1F2937';
}

export function getWireWidth(crossSection: number): number {
  const widths: Record<number, number> = {
    1.5: 1,
    2.5: 1.5,
    4: 2,
    6: 2.5,
    10: 3,
  };
  return widths[crossSection] || 1.5;
}

const SCALE_MIN = 0.25;
const SCALE_MAX = 4;

export function clampComponentScale(scale?: number): number {
  const s = scale ?? 1;
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, s));
}

/** World position of a connection point (includes component scale). */
export function connectionPointWorld(
  component: CircuitComponent,
  cp: ConnectionPoint
): { x: number; y: number } {
  const s = clampComponentScale(component.scale);
  const r = rotatePoint(cp.x * s, cp.y * s, component.rotation);
  return { x: component.x + r.x, y: component.y + r.y };
}

/**
 * Outward orientation of a connection point in world space.
 *  - 'h' means the terminal's stub is horizontal (terminal sits on the
 *    left/right edge of the body), so a wire entering or leaving it
 *    perpendicular to the body should run horizontally.
 *  - 'v' means the terminal's stub is vertical (top/bottom edge), so the
 *    perpendicular leg should run vertically.
 *
 * The dominant local axis is rotated by the component rotation to give a
 * world-space orientation, so rotated components still wire perpendicular.
 */
export function terminalOutwardOrientation(
  component: CircuitComponent,
  cp: ConnectionPoint
): 'h' | 'v' {
  const lx = cp.x;
  const ly = cp.y;
  let dx = 0;
  let dy = 0;
  if (lx === 0 && ly === 0) {
    dx = 1;
  } else if (Math.abs(lx) >= Math.abs(ly)) {
    dx = lx >= 0 ? 1 : -1;
  } else {
    dy = ly >= 0 ? 1 : -1;
  }
  const r = rotatePoint(dx, dy, component.rotation);
  return Math.abs(r.x) >= Math.abs(r.y) ? 'h' : 'v';
}

/**
 * Build an orthogonal (Manhattan) path from `(lastX, lastY)` to `(x, y)`.
 * `firstAxis` selects which leg leaves the previous point: 'h' draws a
 * horizontal leg first then a vertical one; 'v' is the inverse.
 * Returns the points appended after `(lastX, lastY)`, omitting any segment
 * that would be zero-length.
 */
export function orthogonalLeg(
  lastX: number,
  lastY: number,
  x: number,
  y: number,
  firstAxis: 'h' | 'v'
): number[] {
  const cornerX = firstAxis === 'h' ? x : lastX;
  const cornerY = firstAxis === 'h' ? lastY : y;
  const out: number[] = [];
  if (cornerX !== lastX || cornerY !== lastY) {
    out.push(cornerX, cornerY);
  }
  const tailX = out.length ? cornerX : lastX;
  const tailY = out.length ? cornerY : lastY;
  if (x !== tailX || y !== tailY) {
    out.push(x, y);
  }
  return out;
}

/** Bottom-right style handle anchor in world space (from CP hull + pad). */
export function componentResizeHandleWorld(
  component: CircuitComponent
): { x: number; y: number } {
  if (component.connectionPoints.length === 0) {
    const s = clampComponentScale(component.scale);
    return {
      x: component.x + 28 * s,
      y: component.y + 28 * s,
    };
  }
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const cp of component.connectionPoints) {
    const w = connectionPointWorld(component, cp);
    maxX = Math.max(maxX, w.x);
    maxY = Math.max(maxY, w.y);
  }
  const cx = component.x;
  const cy = component.y;
  const vx = maxX - cx;
  const vy = maxY - cy;
  const len = Math.hypot(vx, vy) || 1;
  const pad = 16;
  return { x: maxX + (vx / len) * pad, y: maxY + (vy / len) * pad };
}
