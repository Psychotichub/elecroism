import type { Circuit, Wire } from '../types';

export type WorldBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

const SYMBOL_PAD = 80;
const WIRE_PAD = 20;

export function mergeBounds(a: WorldBounds, b: WorldBounds): WorldBounds {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

export function boundsForWire(wire: Wire, pad = WIRE_PAD): WorldBounds | null {
  if (wire.points.length < 2) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < wire.points.length; i += 2) {
    const x = wire.points[i] ?? 0;
    const y = wire.points[i + 1] ?? 0;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return {
    minX: minX - pad,
    maxX: maxX + pad,
    minY: minY - pad,
    maxY: maxY + pad,
  };
}

export function boundsForComponents(
  circuit: Circuit,
  componentIds: string[],
  pad = SYMBOL_PAD
): WorldBounds | null {
  const comps = circuit.components.filter((c) => componentIds.includes(c.id));
  if (comps.length === 0) return null;
  const xs = comps.map((c) => c.x);
  const ys = comps.map((c) => c.y);
  return {
    minX: Math.min(...xs) - pad,
    maxX: Math.max(...xs) + pad,
    minY: Math.min(...ys) - pad,
    maxY: Math.max(...ys) + pad,
  };
}

export function computeDrawingContentBounds(circuit: Circuit): WorldBounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let any = false;

  for (const c of circuit.components) {
    any = true;
    minX = Math.min(minX, c.x - SYMBOL_PAD);
    maxX = Math.max(maxX, c.x + SYMBOL_PAD);
    minY = Math.min(minY, c.y - SYMBOL_PAD);
    maxY = Math.max(maxY, c.y + SYMBOL_PAD);
  }

  for (const w of circuit.wires) {
    for (let i = 0; i < w.points.length; i += 2) {
      any = true;
      const x = w.points[i];
      const y = w.points[i + 1];
      minX = Math.min(minX, x - WIRE_PAD);
      maxX = Math.max(maxX, x + WIRE_PAD);
      minY = Math.min(minY, y - WIRE_PAD);
      maxY = Math.max(maxY, y + WIRE_PAD);
    }
  }

  if (!any) return null;
  return { minX, minY, maxX, maxY };
}

export function normalizeBounds(
  bounds: WorldBounds,
  minSize = 120
): WorldBounds {
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  if (w >= minSize && h >= minSize) return bounds;
  const cx = (bounds.minX + bounds.maxX) * 0.5;
  const cy = (bounds.minY + bounds.maxY) * 0.5;
  const halfW = Math.max(minSize * 0.5, w * 0.5);
  const halfH = Math.max(minSize * 0.5, h * 0.5);
  return {
    minX: cx - halfW,
    maxX: cx + halfW,
    minY: cy - halfH,
    maxY: cy + halfH,
  };
}
