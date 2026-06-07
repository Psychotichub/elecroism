import type { Circuit, Wire } from '../types';
import {
  connectionPointWorld,
  terminalOutwardOrientation,
} from './geometry';
import {
  buildWireObstacleRects,
  dedupeWirePoints,
  routeWireBetweenTerminals,
} from './wireAutoRoute';
import { translateWireSegment } from './wireGripUtils';

export type WireSegmentDesc = {
  orientation: 'h' | 'v';
  /** Fixed world coordinate (y for horizontal, x for vertical). */
  coord: number;
  start: number;
  end: number;
};

export function parseWireSegment(
  points: number[],
  segmentIndex: number
): WireSegmentDesc | null {
  const n = points.length / 2;
  if (segmentIndex < 0 || segmentIndex >= n - 1) return null;
  const x0 = points[segmentIndex * 2];
  const y0 = points[segmentIndex * 2 + 1];
  const x1 = points[(segmentIndex + 1) * 2];
  const y1 = points[(segmentIndex + 1) * 2 + 1];
  if (Math.abs(y1 - y0) < 1e-3) {
    return {
      orientation: 'h',
      coord: y0,
      start: Math.min(x0, x1),
      end: Math.max(x0, x1),
    };
  }
  if (Math.abs(x1 - x0) < 1e-3) {
    return {
      orientation: 'v',
      coord: x0,
      start: Math.min(y0, y1),
      end: Math.max(y0, y1),
    };
  }
  return null;
}

export function segmentsParallelOverlap(
  a: WireSegmentDesc,
  b: WireSegmentDesc,
  parallelTol = 24,
  minOverlap = 12
): boolean {
  if (a.orientation !== b.orientation) return false;
  if (Math.abs(a.coord - b.coord) > parallelTol) return false;
  const overlap = Math.min(a.end, b.end) - Math.max(a.start, b.start);
  return overlap >= minOverlap;
}

export type BundlePeer = { wireId: string; segmentIndex: number };

export function findBundlePeers(
  circuit: Circuit,
  wireId: string,
  segmentIndex: number
): BundlePeer[] {
  const wire = circuit.wires.find((w) => w.id === wireId);
  if (!wire) return [];
  const seg = parseWireSegment(wire.points, segmentIndex);
  if (!seg) return [];
  const peers: BundlePeer[] = [];
  for (const other of circuit.wires) {
    if (other.id === wireId) continue;
    const segCount = other.points.length / 2 - 1;
    for (let i = 0; i < segCount; i++) {
      const otherSeg = parseWireSegment(other.points, i);
      if (otherSeg && segmentsParallelOverlap(seg, otherSeg)) {
        peers.push({ wireId: other.id, segmentIndex: i });
        break;
      }
    }
  }
  return peers;
}

export function collectBundleDragSnapshot(
  circuit: Circuit,
  wireId: string,
  segmentIndex: number
): Map<string, number[]> {
  const snapshot = new Map<string, number[]>();
  const wire = circuit.wires.find((w) => w.id === wireId);
  if (!wire) return snapshot;
  snapshot.set(wireId, [...wire.points]);
  for (const peer of findBundlePeers(circuit, wireId, segmentIndex)) {
    const pw = circuit.wires.find((w) => w.id === peer.wireId);
    if (pw) snapshot.set(peer.wireId, [...pw.points]);
  }
  return snapshot;
}

/** Apply the same segment translation to a wire bundle (live drag or commit). */
export function translateBundleSegment(
  snapshot: Map<string, number[]>,
  primaryWireId: string,
  primarySegmentIndex: number,
  dx: number,
  dy: number
): Map<string, number[]> {
  const out = new Map<string, number[]>();
  const primaryPts = snapshot.get(primaryWireId);
  if (!primaryPts) return out;
  const primarySeg = parseWireSegment(primaryPts, primarySegmentIndex);
  if (!primarySeg) return out;

  for (const [wid, startPts] of snapshot) {
    if (wid === primaryWireId) {
      const next = translateWireSegment(
        startPts,
        primarySegmentIndex,
        dx,
        dy
      );
      if (next) out.set(wid, next);
      continue;
    }
    const peer = findBundlePeersFromSnapshot(
      snapshot,
      primaryWireId,
      primarySegmentIndex,
      wid
    );
    if (!peer) continue;
    const next = translateWireSegment(startPts, peer.segmentIndex, dx, dy);
    if (next) out.set(wid, next);
  }
  return out;
}

function findBundlePeersFromSnapshot(
  snapshot: Map<string, number[]>,
  primaryWireId: string,
  primarySegmentIndex: number,
  peerWireId: string
): BundlePeer | null {
  const primaryPts = snapshot.get(primaryWireId);
  const peerPts = snapshot.get(peerWireId);
  if (!primaryPts || !peerPts) return null;
  const seg = parseWireSegment(primaryPts, primarySegmentIndex);
  if (!seg) return null;
  const segCount = peerPts.length / 2 - 1;
  for (let i = 0; i < segCount; i++) {
    const otherSeg = parseWireSegment(peerPts, i);
    if (otherSeg && segmentsParallelOverlap(seg, otherSeg)) {
      return { wireId: peerWireId, segmentIndex: i };
    }
  }
  return null;
}

function longestSegment(points: number[]): {
  index: number;
  desc: WireSegmentDesc;
} | null {
  const n = points.length / 2 - 1;
  let best: { index: number; desc: WireSegmentDesc; len: number } | null = null;
  for (let i = 0; i < n; i++) {
    const desc = parseWireSegment(points, i);
    if (!desc) continue;
    const len = desc.end - desc.start;
    if (!best || len > best.len) best = { index: i, desc, len };
  }
  return best ? { index: best.index, desc: best.desc } : null;
}

function shiftSegmentCoord(
  points: number[],
  segmentIndex: number,
  newCoord: number
): number[] {
  const desc = parseWireSegment(points, segmentIndex);
  if (!desc) return points;
  const out = [...points];
  if (desc.orientation === 'h') {
    out[segmentIndex * 2 + 1] = newCoord;
    out[(segmentIndex + 1) * 2 + 1] = newCoord;
  } else {
    out[segmentIndex * 2] = newCoord;
    out[(segmentIndex + 1) * 2] = newCoord;
  }
  return out;
}

/**
 * Evenly space wires that share a parallel trunk with the reference wire.
 */
export function bundleParallelWires(
  circuit: Circuit,
  referenceWireId: string,
  spacing = circuit.gridSize
): Circuit {
  const ref = circuit.wires.find((w) => w.id === referenceWireId);
  if (!ref) return circuit;
  const trunk = longestSegment(ref.points);
  if (!trunk) return circuit;

  const members: { wireId: string; segmentIndex: number; coord: number }[] = [
    {
      wireId: ref.id,
      segmentIndex: trunk.index,
      coord: trunk.desc.coord,
    },
  ];

  const bundleTol = Math.max(spacing * 2, circuit.gridSize * 2);
  for (const w of circuit.wires) {
    if (w.id === ref.id) continue;
    const segCount = w.points.length / 2 - 1;
    for (let i = 0; i < segCount; i++) {
      const desc = parseWireSegment(w.points, i);
      if (desc && segmentsParallelOverlap(trunk.desc, desc, bundleTol)) {
        members.push({ wireId: w.id, segmentIndex: i, coord: desc.coord });
        break;
      }
    }
  }

  if (members.length < 2) return circuit;

  members.sort((a, b) => a.coord - b.coord);
  const mid = (members[0].coord + members[members.length - 1].coord) / 2;
  const step = Math.max(4, spacing);
  const targetCoords = members.map((_, i) => {
    const offset = (i - (members.length - 1) / 2) * step;
    return mid + offset;
  });

  const pointUpdates = new Map<string, number[]>();
  members.forEach((m, i) => {
    const wire = circuit.wires.find((w) => w.id === m.wireId)!;
    const base = pointUpdates.get(m.wireId) ?? wire.points;
    pointUpdates.set(
      m.wireId,
      shiftSegmentCoord(base, m.segmentIndex, targetCoords[i])
    );
  });

  return {
    ...circuit,
    wires: circuit.wires.map((w) => {
      const pts = pointUpdates.get(w.id);
      return pts ? { ...w, points: pts } : w;
    }),
    updatedAt: new Date().toISOString(),
  };
}

export function rerouteWireWithAutoAvoid(
  circuit: Circuit,
  wire: Wire
): number[] | null {
  const fromComp = circuit.components.find((c) => c.id === wire.fromComponentId);
  const toComp = circuit.components.find((c) => c.id === wire.toComponentId);
  const fromPoint = fromComp?.connectionPoints.find(
    (p) => p.id === wire.fromPointId
  );
  const toPoint = toComp?.connectionPoints.find((p) => p.id === wire.toPointId);
  if (!fromComp || !toComp || !fromPoint || !toPoint) return null;

  const { x: sx, y: sy } = connectionPointWorld(fromComp, fromPoint);
  const { x: ex, y: ey } = connectionPointWorld(toComp, toPoint);
  const rects = buildWireObstacleRects(
    circuit,
    new Set([wire.fromComponentId, wire.toComponentId])
  );
  const routed = routeWireBetweenTerminals(
    sx,
    sy,
    ex,
    ey,
    terminalOutwardOrientation(fromComp, fromPoint),
    terminalOutwardOrientation(toComp, toPoint),
    rects,
    circuit.gridSize
  );
  return routed.length >= 4 ? dedupeWirePoints(routed) : null;
}
