import type { Circuit, Wire } from '../types';
import {
  connectionPointWorld,
  orthogonalLeg,
  terminalOutwardOrientation,
} from './geometry';
import { inferWireColor } from './inferWireColor';
import {
  buildWireObstacleRects,
  dedupeWirePoints,
  routeWireBetweenTerminals,
} from './wireAutoRoute';

export type WireTerminalPreviewKind = 'valid' | 'invalid' | 'bend';

export function buildWireFinishPolyline(input: {
  circuit: Circuit;
  fromComponentId: string;
  fromPointId: string;
  toComponentId: string;
  toPointId: string;
  wirePoints: number[];
  wireAutoRouteEnabled: boolean;
}): number[] | null {
  const {
    circuit,
    fromComponentId,
    fromPointId,
    toComponentId,
    toPointId,
    wirePoints: pts,
    wireAutoRouteEnabled,
  } = input;

  const comp = circuit.components.find((c) => c.id === toComponentId);
  const point = comp?.connectionPoints.find((p) => p.id === toPointId);
  const fromComp = circuit.components.find((c) => c.id === fromComponentId);
  const fromPoint = fromComp?.connectionPoints.find(
    (p) => p.id === fromPointId
  );
  if (!comp || !point || !fromComp || !fromPoint) return null;

  const { x: absX, y: absY } = connectionPointWorld(comp, point);

  const useAutoRoute =
    wireAutoRouteEnabled && pts.length === 2 && fromComp && fromPoint;

  if (useAutoRoute) {
    const { x: sx, y: sy } = connectionPointWorld(fromComp, fromPoint);
    const startAxis = terminalOutwardOrientation(fromComp, fromPoint);
    const endAxis = terminalOutwardOrientation(comp, point);
    const rects = buildWireObstacleRects(
      circuit,
      new Set([fromComponentId, toComponentId])
    );
    return dedupeWirePoints(
      routeWireBetweenTerminals(
        sx,
        sy,
        absX,
        absY,
        startAxis,
        endAxis,
        rects,
        circuit.gridSize
      )
    );
  }

  if (pts.length >= 2) {
    const lastX = pts[pts.length - 2];
    const lastY = pts[pts.length - 1];
    const targetOrientation = terminalOutwardOrientation(comp, point);
    const firstAxis: 'h' | 'v' =
      targetOrientation === 'h' ? 'v' : 'h';
    const tail = orthogonalLeg(lastX, lastY, absX, absY, firstAxis);
    return [...pts, ...tail];
  }

  return [...pts, absX, absY];
}

export function wireFinishDuplicateExists(
  wires: Wire[],
  fromComponentId: string,
  fromPointId: string,
  toComponentId: string,
  toPointId: string
): boolean {
  return wires.some(
    (w) =>
      (w.fromComponentId === fromComponentId &&
        w.fromPointId === fromPointId &&
        w.toComponentId === toComponentId &&
        w.toPointId === toPointId) ||
      (w.fromComponentId === toComponentId &&
        w.fromPointId === toPointId &&
        w.toComponentId === fromComponentId &&
        w.toPointId === fromPointId)
  );
}

/** Short tag for in-canvas wire-type hint while hovering a finish terminal. */
export function wirePreviewTypeTag(
  fromLabel: string,
  toLabel: string
): string {
  const c = inferWireColor(fromLabel, toLabel);
  const joined = `${fromLabel} ${toLabel}`.toUpperCase();
  switch (c) {
    case 'ethernet':
      return 'ETH';
    case 'green_yellow':
      return 'PE';
    case 'blue':
      return 'N';
    case 'brown':
      if (joined.includes('L1')) return 'L1';
      if (joined.includes('L2')) return 'L2';
      if (joined.includes('L3')) return 'L3';
      return 'L';
    case 'red':
      if (joined.includes('24')) return '24VDC';
      return '+DC';
    case 'black':
      if (/\b(MINUS|DC_MINUS)\b/i.test(joined)) return '−DC';
      if (joined.includes('L2')) return 'L2';
      return 'DC';
    case 'grey':
      return 'L3';
    default:
      return '';
  }
}
