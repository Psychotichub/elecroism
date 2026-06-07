import { v4 as uuid } from 'uuid';
import type { Circuit, CircuitComponent, ComponentType, Wire } from '../types';
import {
  connectionPointWorld,
  snapToGrid,
  terminalOutwardOrientation,
} from './geometry';
import {
  buildWireObstacleRects,
  dedupeWirePoints,
  routeWireBetweenTerminals,
} from './wireAutoRoute';
import { refreshAutoWireNumbers } from './wireEndpointNumbering';
import { createConnectionPoints } from '../store/circuitConnectionGeometry';

const BUSBAR_TYPES = new Set<ComponentType>(['busbar', 'busbar_system']);

const FEEDER_ROOT_TYPES = new Set<ComponentType>([
  'mcb',
  'three_phase_mcb',
  'mccb',
  'four_phase_mcb',
  'motor_protection_circuit_breaker',
  'hrc_fuse',
  'control_circuit_fuse',
]);

export type BusDropResult = {
  circuit: Circuit;
  newBreakerId: string | null;
  message: string;
};

export function isBusbarType(type: ComponentType): boolean {
  return BUSBAR_TYPES.has(type);
}

export function isFeederRootType(type: ComponentType): boolean {
  return FEEDER_ROOT_TYPES.has(type);
}

export function isBusbarTapLabel(label: string): boolean {
  return /^TAP_/i.test(label.trim());
}

export function incrementDesignator(label: string): string {
  const trimmed = label.trim();
  const m = trimmed.match(/^([A-Za-z][A-Za-z0-9]*?)(\d+)(.*)$/);
  if (m) {
    return `${m[1]}${Number(m[2]) + 1}${m[3]}`;
  }
  return `${trimmed} 2`;
}

/** Bump the numeric suffix, skipping labels already used on the drawing. */
export function nextAvailableDesignator(
  circuit: Circuit,
  templateLabel: string
): string {
  const trimmed = templateLabel.trim();
  const m = trimmed.match(/^([A-Za-z][A-Za-z0-9]*?)(\d+)(.*)$/);
  if (!m) return incrementDesignator(trimmed);
  const prefix = m[1];
  const suffix = m[3];
  const escSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${prefix}(\\d+)${escSuffix}$`, 'i');
  let max = Number(m[2]);
  for (const c of circuit.components) {
    const hit = c.label.trim().match(re);
    if (hit) max = Math.max(max, Number(hit[1]));
  }
  return `${prefix}${max + 1}${suffix}`;
}

export function sortedBusbarTaps(busbar: CircuitComponent): CircuitComponent['connectionPoints'] {
  return [...busbar.connectionPoints].sort((a, b) => a.x - b.x);
}

export function tapIndexOnBusbar(
  busbar: CircuitComponent,
  pointId: string
): number {
  const taps = sortedBusbarTaps(busbar);
  return taps.findIndex((cp) => cp.id === pointId);
}

export function isTapOccupied(
  circuit: Circuit,
  busbarId: string,
  pointId: string
): boolean {
  return circuit.wires.some(
    (w) =>
      (w.fromComponentId === busbarId && w.fromPointId === pointId) ||
      (w.toComponentId === busbarId && w.toPointId === pointId)
  );
}

/** Busbars fed from the same upstream device(s) with matching tap layout. */
export function findPhaseBusbarGroup(
  circuit: Circuit,
  seedBusbarId: string
): CircuitComponent[] {
  const seed = circuit.components.find((c) => c.id === seedBusbarId);
  if (!seed || !isBusbarType(seed.type)) return [];

  const incoming = circuit.wires.filter((w) => w.toComponentId === seedBusbarId);
  const upstreamIds = new Set(incoming.map((w) => w.fromComponentId));
  const tapCount = seed.connectionPoints.length;

  const group = circuit.components.filter((c) => {
    if (!isBusbarType(c.type)) return false;
    if (c.connectionPoints.length !== tapCount) return false;
    if (upstreamIds.size === 0) return c.id === seedBusbarId;
    const inc = circuit.wires.filter((w) => w.toComponentId === c.id);
    return inc.some((w) => upstreamIds.has(w.fromComponentId));
  });

  return group.sort((a, b) => a.y - b.y);
}

function isPhaseFeederWire(w: Wire): boolean {
  if (w.wireCategory === 'control' || w.wireCategory === 'comm') return false;
  return w.color !== 'blue';
}

function breakerOutPointIds(breaker: CircuitComponent): Set<string> {
  const out = new Set<string>();
  for (const cp of breaker.connectionPoints) {
    const n = Number(cp.label);
    if (!Number.isNaN(n) && n % 2 === 0) out.add(cp.id);
    else if (cp.y > 0) out.add(cp.id);
  }
  return out;
}

/** Breaker and phase-fed downstream loads (excludes shared neutral / busbar feeds). */
export function collectFeederBranch(
  circuit: Circuit,
  breakerId: string
): { componentIds: Set<string>; wires: Wire[] } | null {
  const root = circuit.components.find((c) => c.id === breakerId);
  if (!root || !isFeederRootType(root.type)) return null;

  const componentIds = new Set<string>([breakerId]);
  const wires: Wire[] = [];
  const queue: string[] = [];
  const outPoints = breakerOutPointIds(root);

  for (const w of circuit.wires) {
    if (
      w.fromComponentId === breakerId &&
      outPoints.has(w.fromPointId) &&
      isPhaseFeederWire(w)
    ) {
      wires.push(w);
      if (!componentIds.has(w.toComponentId)) {
        componentIds.add(w.toComponentId);
        queue.push(w.toComponentId);
      }
    }
  }

  while (queue.length > 0) {
    const compId = queue.shift()!;
    const comp = circuit.components.find((c) => c.id === compId);
    if (comp && isFeederRootType(comp.type) && compId !== breakerId) continue;
    if (comp && isBusbarType(comp.type)) continue;

    for (const w of circuit.wires) {
      if (!isPhaseFeederWire(w) || wires.some((bw) => bw.id === w.id)) continue;
      let other: string | null = null;
      if (w.fromComponentId === compId) other = w.toComponentId;
      else if (w.toComponentId === compId) other = w.fromComponentId;
      else continue;
      if (other === breakerId) continue;
      const otherComp = circuit.components.find((c) => c.id === other);
      if (otherComp && isFeederRootType(otherComp.type)) continue;
      if (otherComp && isBusbarType(otherComp.type)) continue;
      wires.push(w);
      if (!componentIds.has(other)) {
        componentIds.add(other);
        queue.push(other);
      }
    }
  }

  return { componentIds, wires };
}

function busbarIncomingWires(
  circuit: Circuit,
  breakerId: string,
  busbarIds: Set<string>
): Wire[] {
  return circuit.wires.filter(
    (w) =>
      busbarIds.has(w.fromComponentId) && w.toComponentId === breakerId
  );
}

export function findTemplateBreakerOnGroup(
  circuit: Circuit,
  busbarGroup: CircuitComponent[],
  preferTapIndex?: number
): string | null {
  if (busbarGroup.length === 0) return null;
  const tapCount = busbarGroup[0].connectionPoints.length;

  const indices =
    preferTapIndex != null && preferTapIndex >= 0
      ? [
          preferTapIndex - 1,
          preferTapIndex,
          ...Array.from({ length: tapCount }, (_, i) => i),
        ]
      : Array.from({ length: tapCount }, (_, i) => i);

  const seen = new Set<number>();
  for (const idx of indices) {
    if (idx < 0 || idx >= tapCount || seen.has(idx)) continue;
    seen.add(idx);
    const breakerIds = new Set<string>();
    let complete = true;
    for (const bus of busbarGroup) {
      const tap = sortedBusbarTaps(bus)[idx];
      if (!tap) {
        complete = false;
        break;
      }
      const w = circuit.wires.find(
        (wire) =>
          wire.fromComponentId === bus.id && wire.fromPointId === tap.id
      );
      if (!w) {
        complete = false;
        break;
      }
      breakerIds.add(w.toComponentId);
    }
    if (complete && breakerIds.size === 1) {
      const id = [...breakerIds][0];
      const comp = circuit.components.find((c) => c.id === id);
      if (comp && isFeederRootType(comp.type)) return id;
    }
  }
  return null;
}

export function nextFreeTapIndex(
  circuit: Circuit,
  busbarGroup: CircuitComponent[]
): number {
  const tapCount = busbarGroup[0]?.connectionPoints.length ?? 0;
  let maxUsed = -1;
  for (let i = 0; i < tapCount; i++) {
    const used = busbarGroup.some((bus) => {
      const tap = sortedBusbarTaps(bus)[i];
      return tap && isTapOccupied(circuit, bus.id, tap.id);
    });
    if (used) maxUsed = i;
  }
  return maxUsed + 1;
}

function extendBusbarGroupTaps(circuit: Circuit, group: CircuitComponent[]): Circuit {
  let next = circuit;
  for (const bus of group) {
    const left = Math.max(
      1,
      Number(bus.properties.busbarLeftCount ?? 3) || 3
    );
    const right = Math.max(
      1,
      Number(bus.properties.busbarRightCount ?? 3) || 3
    );
    const generated = createConnectionPoints(bus.id, bus.type, {
      busbarLeftCount: left,
      busbarRightCount: right + 1,
    });
    const byPos = new Map<string, string>(
      bus.connectionPoints.map((cp) => [`${cp.x},${cp.y}`, cp.id])
    );
    const connectionPoints = generated.map((cp) => {
      const key = `${cp.x},${cp.y}`;
      const existingId = byPos.get(key);
      return existingId ? { ...cp, id: existingId } : cp;
    });
    next = {
      ...next,
      components: next.components.map((c) =>
        c.id === bus.id
          ? {
              ...c,
              properties: {
                ...c.properties,
                busbarRightCount: right + 1,
              },
              connectionPoints,
            }
          : c
      ),
    };
  }
  return next;
}

function ensureTapIndexAvailable(
  circuit: Circuit,
  group: CircuitComponent[],
  tapIndex: number
): Circuit {
  const tapCount = group[0]?.connectionPoints.length ?? 0;
  if (tapIndex < tapCount) return circuit;
  return extendBusbarGroupTaps(circuit, group);
}

function routeFeederWire(
  circuit: Circuit,
  fromComp: CircuitComponent,
  fromPointId: string,
  toComp: CircuitComponent,
  toPointId: string,
  template: Wire
): Wire {
  const fromPoint = fromComp.connectionPoints.find((p) => p.id === fromPointId);
  const toPoint = toComp.connectionPoints.find((p) => p.id === toPointId);
  if (!fromPoint || !toPoint) {
    throw new Error('Missing connection point for feeder wire');
  }
  const { x: sx, y: sy } = connectionPointWorld(fromComp, fromPoint);
  const { x: ex, y: ey } = connectionPointWorld(toComp, toPoint);
  const rects = buildWireObstacleRects(
    circuit,
    new Set([fromComp.id, toComp.id])
  );
  const points = dedupeWirePoints(
    routeWireBetweenTerminals(
      sx,
      sy,
      ex,
      ey,
      terminalOutwardOrientation(fromComp, fromPoint),
      terminalOutwardOrientation(toComp, toPoint),
      rects,
      circuit.gridSize
    )
  );
  return {
    id: uuid(),
    fromComponentId: fromComp.id,
    fromPointId,
    toComponentId: toComp.id,
    toPointId,
    points,
    color: template.color,
    wireCategory: template.wireCategory,
    wireProtocol: template.wireProtocol ?? 'none',
    crossSection: template.crossSection,
    energized: false,
    currentAmps: 0,
    wireNumberAuto: true,
    styleLayer: template.styleLayer,
  };
}

export type DuplicateFeederOptions = {
  /** Busbar tap used to start a bus-drop wire (primary phase bar). */
  seedBusbarId?: string;
  seedTapPointId?: string;
  /** Canvas drop position (breaker anchor). */
  dropX?: number;
  dropY?: number;
  /** Explicit template breaker; otherwise inferred from busbar group. */
  templateBreakerId?: string;
};

export function duplicateIdenticalFeeder(
  circuit: Circuit,
  options: DuplicateFeederOptions = {}
): BusDropResult | null {
  let working = circuit;
  const grid = working.gridSize;

  let busbarGroup: CircuitComponent[];
  let targetTapIndex: number;

  if (options.seedBusbarId && options.seedTapPointId) {
    busbarGroup = findPhaseBusbarGroup(working, options.seedBusbarId);
    const seed = working.components.find((c) => c.id === options.seedBusbarId);
    if (!seed) return null;
    targetTapIndex = tapIndexOnBusbar(seed, options.seedTapPointId);
    if (targetTapIndex < 0) return null;
    if (isTapOccupied(working, seed.id, options.seedTapPointId)) {
      return {
        circuit: working,
        newBreakerId: null,
        message: 'Busbar tap is already wired.',
      };
    }
  } else if (options.templateBreakerId) {
    const templateBreaker = working.components.find(
      (c) => c.id === options.templateBreakerId
    );
    if (!templateBreaker) return null;
    const incoming = working.wires.filter(
      (w) => w.toComponentId === templateBreaker.id
    );
    const seedBus = working.components.find((c) =>
      incoming.some(
        (w) =>
          w.fromComponentId === c.id && isBusbarType(c.type)
      )
    );
    if (!seedBus) {
      return {
        circuit: working,
        newBreakerId: null,
        message: 'No busbar feed found for this breaker.',
      };
    }
    busbarGroup = findPhaseBusbarGroup(working, seedBus.id);
    targetTapIndex = nextFreeTapIndex(working, busbarGroup);
  } else {
    return null;
  }

  if (busbarGroup.length === 0) {
    return {
      circuit: working,
      newBreakerId: null,
      message: 'No phase busbar group found.',
    };
  }

  working = ensureTapIndexAvailable(working, busbarGroup, targetTapIndex);
  busbarGroup = findPhaseBusbarGroup(working, busbarGroup[0].id);

  const templateBreakerId =
    options.templateBreakerId ??
    findTemplateBreakerOnGroup(working, busbarGroup, targetTapIndex);
  if (!templateBreakerId) {
    return {
      circuit: working,
      newBreakerId: null,
      message: 'No existing feeder to copy — wire one feeder first.',
    };
  }

  const branch = collectFeederBranch(working, templateBreakerId);
  if (!branch) return null;

  const templateBreaker = working.components.find(
    (c) => c.id === templateBreakerId
  )!;
  const busbarIds = new Set(busbarGroup.map((b) => b.id));
  const templateIncoming = busbarIncomingWires(
    working,
    templateBreakerId,
    busbarIds
  );

  const primaryBus = busbarGroup[0];
  const targetTap = sortedBusbarTaps(primaryBus)[targetTapIndex];
  if (!targetTap) {
    return {
      circuit: working,
      newBreakerId: null,
      message: 'Busbar tap index out of range.',
    };
  }

  const dropX =
    options.dropX != null
      ? snapToGrid(options.dropX, grid)
      : snapToGrid(primaryBus.x + targetTap.x, grid);
  const dropY =
    options.dropY != null
      ? snapToGrid(options.dropY, grid)
      : templateBreaker.y;

  const offsetX = dropX - templateBreaker.x;
  const offsetY = dropY - templateBreaker.y;

  const idMap = new Map<string, string>();
  const pointIdMap = new Map<string, string>();

  const newComponents = [...branch.componentIds]
    .map((id) => working.components.find((c) => c.id === id))
    .filter((c): c is CircuitComponent => !!c)
    .map((c) => {
      const newId = uuid();
      idMap.set(c.id, newId);
      const newConnectionPoints = c.connectionPoints.map((cp) => {
        const newCpId = uuid();
        pointIdMap.set(cp.id, newCpId);
        return { ...cp, id: newCpId, componentId: newId };
      });
      const isRoot = c.id === templateBreakerId;
      return {
        ...c,
        id: newId,
        label: nextAvailableDesignator(working, c.label),
        x: c.x + offsetX,
        y: c.y + offsetY,
        connectionPoints: newConnectionPoints,
        selected: isRoot,
      };
    });

  const newBreakerId = idMap.get(templateBreakerId) ?? null;

  const internalWires = branch.wires.map((w) => ({
    ...w,
    id: uuid(),
    fromComponentId: idMap.get(w.fromComponentId)!,
    fromPointId: pointIdMap.get(w.fromPointId)!,
    toComponentId: idMap.get(w.toComponentId)!,
    toPointId: pointIdMap.get(w.toPointId)!,
    points: w.points.map((p, i) => p + (i % 2 === 0 ? offsetX : offsetY)),
    wireNumberAuto: w.wireNumberAuto ?? true,
  }));

  const feederWires: Wire[] = [];
  const newBreaker = newComponents.find((c) => c.id === newBreakerId);
  if (newBreaker) {
    for (const templateWire of templateIncoming) {
      const bus = working.components.find(
        (c) => c.id === templateWire.fromComponentId
      );
      if (!bus) continue;
      const templateTapIdx = tapIndexOnBusbar(
        bus,
        templateWire.fromPointId
      );
      const newBus = busbarGroup.find((b) => b.id === bus.id) ?? bus;
      const newTap = sortedBusbarTaps(newBus)[targetTapIndex];
      const toPointId = pointIdMap.get(templateWire.toPointId);
      if (!newTap || !toPointId) continue;
      feederWires.push(
        routeFeederWire(
          working,
          newBus,
          newTap.id,
          newBreaker,
          toPointId,
          templateWire
        )
      );
      void templateTapIdx;
    }
  }

  const deselectOld = working.components.map((c) => ({
    ...c,
    selected: false,
  }));

  let nextCircuit: Circuit = {
    ...working,
    components: [...deselectOld, ...newComponents],
    wires: [...working.wires, ...internalWires, ...feederWires],
    updatedAt: new Date().toISOString(),
  };

  nextCircuit = refreshAutoWireNumbers(nextCircuit);

  return {
    circuit: nextCircuit,
    newBreakerId,
    message: `Added feeder ${newComponents.find((c) => c.id === newBreakerId)?.label ?? ''}`,
  };
}

export function canStartBusDrop(
  circuit: Circuit,
  busbarId: string,
  pointId: string
): boolean {
  const bus = circuit.components.find((c) => c.id === busbarId);
  if (!bus || !isBusbarType(bus.type)) return false;
  const point = bus.connectionPoints.find((p) => p.id === pointId);
  if (!point || !isBusbarTapLabel(point.label)) return false;
  return !isTapOccupied(circuit, busbarId, pointId);
}
