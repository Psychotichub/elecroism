import type { CircuitComponent, Wire } from '../types';

export type WorldBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/** Start culling when the sheet has at least this many components. */
export const CANVAS_CULL_MIN_COMPONENTS = 80;

/** Extra world-space margin around the viewport (reduces pop-in while panning). */
export const VIEWPORT_CULL_PADDING = 120;

/** Default half-extent for a symbol hit box (matches drawing export padding). */
export const COMPONENT_CULL_RADIUS = 80;

export function worldViewportBounds(
  stageWidth: number,
  stageHeight: number,
  panX: number,
  panY: number,
  zoom: number,
  paddingWorld = VIEWPORT_CULL_PADDING
): WorldBounds {
  const z = zoom || 1;
  return {
    minX: -panX / z - paddingWorld,
    minY: -panY / z - paddingWorld,
    maxX: (stageWidth - panX) / z + paddingWorld,
    maxY: (stageHeight - panY) / z + paddingWorld,
  };
}

export function boundsIntersect(a: WorldBounds, b: WorldBounds): boolean {
  return (
    a.minX <= b.maxX &&
    a.maxX >= b.minX &&
    a.minY <= b.maxY &&
    a.maxY >= b.minY
  );
}

export function componentWorldBounds(
  comp: CircuitComponent,
  pad = COMPONENT_CULL_RADIUS
): WorldBounds {
  const scale = comp.scale ?? 1;
  const half = pad * scale;
  return {
    minX: comp.x - half,
    maxX: comp.x + half,
    minY: comp.y - half,
    maxY: comp.y + half,
  };
}

function pointInBounds(x: number, y: number, b: WorldBounds): boolean {
  return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
}

/** Cohen–Sutherland-style segment vs axis-aligned rectangle test. */
export function segmentIntersectsBounds(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  b: WorldBounds
): boolean {
  if (pointInBounds(x1, y1, b) || pointInBounds(x2, y2, b)) return true;

  const edges: Array<[number, number, number, number]> = [
    [b.minX, b.minY, b.maxX, b.minY],
    [b.maxX, b.minY, b.maxX, b.maxY],
    [b.maxX, b.maxY, b.minX, b.maxY],
    [b.minX, b.maxY, b.minX, b.minY],
  ];

  for (const [ex1, ey1, ex2, ey2] of edges) {
    if (segmentsIntersect(x1, y1, x2, y2, ex1, ey1, ex2, ey2)) return true;
  }
  return false;
}

function segmentsIntersect(
  ax1: number,
  ay1: number,
  ax2: number,
  ay2: number,
  bx1: number,
  by1: number,
  bx2: number,
  by2: number
): boolean {
  const d =
    (ax2 - ax1) * (by2 - by1) - (ay2 - ay1) * (bx2 - bx1);
  if (Math.abs(d) < 1e-9) return false;
  const t =
    ((bx1 - ax1) * (by2 - by1) - (by1 - ay1) * (bx2 - bx1)) / d;
  const u =
    ((bx1 - ax1) * (ay2 - ay1) - (by1 - ay1) * (ax2 - ax1)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function wireIntersectsViewport(wire: Wire, viewport: WorldBounds): boolean {
  const pts = wire.points;
  if (pts.length < 2) return false;

  for (let i = 0; i < pts.length; i += 2) {
    if (pointInBounds(pts[i], pts[i + 1], viewport)) return true;
  }

  for (let i = 0; i < pts.length - 2; i += 2) {
    if (
      segmentIntersectsBounds(
        pts[i],
        pts[i + 1],
        pts[i + 2],
        pts[i + 3],
        viewport
      )
    ) {
      return true;
    }
  }
  return false;
}

export type VisibleCanvasPickOptions = {
  pinComponentIds?: ReadonlySet<string>;
  pinWireIds?: ReadonlySet<string>;
  componentPad?: number;
};

export function pickVisibleCanvasElements(
  components: CircuitComponent[],
  wires: Wire[],
  viewport: WorldBounds,
  options: VisibleCanvasPickOptions = {}
): { components: CircuitComponent[]; wires: Wire[] } {
  const pinComp = new Set(options.pinComponentIds ?? []);
  const pinWire = new Set(options.pinWireIds ?? []);
  const pad = options.componentPad ?? COMPONENT_CULL_RADIUS;

  const visibleWires: Wire[] = [];
  for (const wire of wires) {
    if (pinWire.has(wire.id) || wireIntersectsViewport(wire, viewport)) {
      visibleWires.push(wire);
      pinComp.add(wire.fromComponentId);
      pinComp.add(wire.toComponentId);
    }
  }

  const visibleComponents: CircuitComponent[] = [];
  for (const comp of components) {
    if (
      pinComp.has(comp.id) ||
      boundsIntersect(componentWorldBounds(comp, pad), viewport)
    ) {
      visibleComponents.push(comp);
    }
  }

  return { components: visibleComponents, wires: visibleWires };
}

export function shouldCullCanvas(
  componentCount: number,
  opts: {
    tool: string;
    wireInProgress: boolean;
    selectionActive: boolean;
    integrityOverlay: boolean;
  }
): boolean {
  if (componentCount < CANVAS_CULL_MIN_COMPONENTS) return false;
  if (opts.tool === 'wire' || opts.wireInProgress) return false;
  if (opts.selectionActive) return false;
  if (opts.integrityOverlay) return false;
  return true;
}
