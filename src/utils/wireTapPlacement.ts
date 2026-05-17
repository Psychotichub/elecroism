import { v4 as uuid } from 'uuid';
import type { Circuit, CircuitComponent, Wire } from '../types';
import { syncWireEndpoints } from '../store/circuitConnectionGeometry';
import { refreshAutoWireNumbers } from './wireEndpointNumbering';
import { nextWireNumber } from './wireLabelLayout';
import { hitTestClosestWireSegment } from './wireEditOps';
import {
  resolveSplitPointOnSegment,
  splitPolylineAtPoint,
} from './wireJunctionSplit';

/**
 * If (worldX, worldY) is on an existing wire span, split that wire and attach
 * both sides to the tap component's single connection point.
 */
export function attachConnectionPointToWireIfHit(
  circuit: Circuit,
  tap: CircuitComponent
): { circuit: Circuit; attached: boolean } {
  const pointId = tap.connectionPoints[0]?.id;
  if (!pointId) return { circuit, attached: false };

  const hit = hitTestClosestWireSegment(circuit, tap.x, tap.y, {
    zoom: circuit.zoom,
  });
  if (!hit) return { circuit, attached: false };

  const targetWire = circuit.wires.find((w) => w.id === hit.wireId);
  if (!targetWire) return { circuit, attached: false };

  const sp = resolveSplitPointOnSegment(
    targetWire.points,
    hit.segmentIndex,
    hit.projX,
    hit.projY
  );
  if (!sp) return { circuit, attached: false };

  const split = splitPolylineAtPoint(
    targetWire.points,
    hit.segmentIndex,
    sp.sx,
    sp.sy
  );
  if (!split) return { circuit, attached: false };

  const { left, right } = split;
  const meta: Pick<
    Wire,
    'color' | 'wireCategory' | 'wireProtocol' | 'crossSection' | 'styleLayer'
  > = {
    color: targetWire.color,
    wireCategory: targetWire.wireCategory,
    wireProtocol: targetWire.wireProtocol ?? 'none',
    crossSection: targetWire.crossSection,
    styleLayer: targetWire.styleLayer,
  };

  const circuitSansTarget: Circuit = {
    ...circuit,
    wires: circuit.wires.filter((w) => w.id !== targetWire.id),
  };
  const wnA = nextWireNumber(circuitSansTarget);
  const wnB = nextWireNumber(circuitSansTarget, [wnA]);
  const targetAuto = targetWire.wireNumberAuto === true;

  const wireA: Wire = {
    id: uuid(),
    fromComponentId: targetWire.fromComponentId,
    fromPointId: targetWire.fromPointId,
    toComponentId: tap.id,
    toPointId: pointId,
    points: left,
    ...meta,
    ...(targetAuto
      ? { wireNumberAuto: true as const }
      : { wireNumber: wnA, wireNumberAuto: false as const }),
    energized: false,
    currentAmps: 0,
  };
  const wireB: Wire = {
    id: uuid(),
    fromComponentId: tap.id,
    fromPointId: pointId,
    toComponentId: targetWire.toComponentId,
    toPointId: targetWire.toPointId,
    points: right,
    ...meta,
    ...(targetAuto
      ? { wireNumberAuto: true as const }
      : { wireNumber: wnB, wireNumberAuto: false as const }),
    energized: false,
    currentAmps: 0,
  };

  const tapAtSplit = { ...tap, x: sp.sx, y: sp.sy };
  const components = circuit.components.map((c) =>
    c.id === tap.id ? tapAtSplit : c
  );

  const next = refreshAutoWireNumbers(
    syncWireEndpoints({
      ...circuit,
      components,
      wires: [...circuitSansTarget.wires, wireA, wireB],
      updatedAt: new Date().toISOString(),
    })
  );

  return { circuit: next, attached: true };
}
