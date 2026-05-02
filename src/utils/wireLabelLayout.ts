import type { Circuit, Wire } from '../types';

/** Text shown on canvas: manual label wins, else auto wire number. */
export function effectiveWireDisplayText(wire: Wire): string {
  const manual = wire.wireLabel?.trim();
  if (manual) return manual;
  return wire.wireNumber?.trim() ?? '';
}

function scanWireNumberToken(s: string | undefined, maxRef: { v: number }) {
  const m = s?.match(/^W(\d+)$/i);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n)) maxRef.v = Math.max(maxRef.v, n);
  }
}

/** Next `W{n}` not used on any wire in `circuit` or in `extraReserved`. */
export function nextWireNumber(
  circuit: Circuit,
  extraReserved: string[] = []
): string {
  const maxRef = { v: 0 };
  for (const w of circuit.wires) {
    scanWireNumberToken(w.wireNumber, maxRef);
  }
  for (const s of extraReserved) {
    scanWireNumberToken(s, maxRef);
  }
  return `W${maxRef.v + 1}`;
}

export type WireSegmentLabelLayout = {
  midX: number;
  midY: number;
  /** Degrees, Konva convention (segment direction). */
  angleDeg: number;
  length: number;
};

/**
 * Midpoint and rotation on the longest straight segment (axis-aligned or diagonal).
 */
export function getLongestWireSegmentLayout(
  points: number[]
): WireSegmentLabelLayout | null {
  const n = points.length / 2;
  if (n < 2) return null;
  let bestLen = -1;
  let x0 = 0;
  let y0 = 0;
  let x1 = 0;
  let y1 = 0;
  for (let i = 0; i < n - 1; i++) {
    const ax = points[i * 2];
    const ay = points[i * 2 + 1];
    const bx = points[(i + 1) * 2];
    const by = points[(i + 1) * 2 + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (len > bestLen) {
      bestLen = len;
      x0 = ax;
      y0 = ay;
      x1 = bx;
      y1 = by;
    }
  }
  if (bestLen < 1e-9) return null;
  const midX = (x0 + x1) / 2;
  const midY = (y0 + y1) / 2;
  const angleRad = Math.atan2(y1 - y0, x1 - x0);
  const angleDeg = (angleRad * 180) / Math.PI;
  return { midX, midY, angleDeg, length: bestLen };
}
