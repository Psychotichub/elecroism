import type { Circuit, CircuitComponent, Wire } from '../types';

/** Avoid `.` / `-` inside name parts so the pattern stays readable. */
function safeNamePart(s: string): string {
  const t = s.trim();
  if (!t) return '?';
  return t.replace(/\s+/g, ' ').replace(/[-.]/g, '_');
}

/** `L_OUT` → `Lout`, `L_IN` → `Lin`, `1` → `1` (e.g. `Q1Lout-Q3Lin`). */
export function formatTerminalTag(label: string): string {
  const t = label.trim();
  if (!t) return '?';
  const parts = t.split(/[_\s]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    const p = parts[0];
    if (p.length <= 2) return p.toUpperCase();
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  }
  if (parts[0].length === 1) {
    return (
      parts[0].toUpperCase() + parts.slice(1).join('').toLowerCase()
    );
  }
  return parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('');
}

function humanizeType(type: CircuitComponent['type']): string {
  return String(type).replace(/_/g, ' ');
}

function componentTitle(c: CircuitComponent | undefined): string {
  if (!c) return '?';
  const lab = c.label?.trim();
  if (lab) return lab;
  return humanizeType(c.type);
}

function isPassthroughNode(c: CircuitComponent | undefined): boolean {
  return c?.type === 'connection_point' || c?.type === 'junction';
}

/** Wire that feeds into a tap (remote is the `from` end). */
function findUpstreamAtTap(
  circuit: Circuit,
  excludeWireId: string,
  tapId: string,
  tapPointId: string
): { componentId: string; pointId: string } | null {
  for (const w of circuit.wires) {
    if (w.id === excludeWireId) continue;
    if (w.toComponentId === tapId && w.toPointId === tapPointId) {
      return { componentId: w.fromComponentId, pointId: w.fromPointId };
    }
  }
  return null;
}

/** Outgoing wire from tap whose polyline continues the incoming wire geometry. */
function findContinuousDownstreamAtTap(
  circuit: Circuit,
  incomingWire: Wire,
  tapId: string,
  tapPointId: string
): { componentId: string; pointId: string } | null {
  const pts = incomingWire.points;
  if (pts.length < 2) return null;
  const ix = pts[pts.length - 2];
  const iy = pts[pts.length - 1];
  for (const w of circuit.wires) {
    if (w.id === incomingWire.id) continue;
    if (w.fromComponentId !== tapId || w.fromPointId !== tapPointId) continue;
    const ox = w.points[0];
    const oy = w.points[1];
    if (Math.hypot(ox - ix, oy - iy) < 1.5) {
      return { componentId: w.toComponentId, pointId: w.toPointId };
    }
  }
  return null;
}

/**
 * Replace connection-point / junction ends with the real device terminal used for
 * labeling (e.g. branch from a tap shows `Q1Lout-Q3Lin`, not `connection point…`).
 */
export function resolveLogicalWireEndpoint(
  circuit: Circuit,
  wire: Wire,
  componentId: string,
  pointId: string,
  depth = 0
): { componentId: string; pointId: string } {
  if (depth > 12) return { componentId, pointId };

  const comp = circuit.components.find((c) => c.id === componentId);
  if (!isPassthroughNode(comp)) return { componentId, pointId };

  const onFrom =
    wire.fromComponentId === componentId && wire.fromPointId === pointId;
  const onTo =
    wire.toComponentId === componentId && wire.toPointId === pointId;

  if (onFrom) {
    const up = findUpstreamAtTap(circuit, wire.id, componentId, pointId);
    if (up) {
      return resolveLogicalWireEndpoint(
        circuit,
        wire,
        up.componentId,
        up.pointId,
        depth + 1
      );
    }
  }

  if (onTo) {
    if (wire.fromComponentId === componentId && wire.fromPointId === pointId) {
      return { componentId: wire.toComponentId, pointId: wire.toPointId };
    }
    const down = findContinuousDownstreamAtTap(
      circuit,
      wire,
      componentId,
      pointId
    );
    if (down) {
      return resolveLogicalWireEndpoint(
        circuit,
        wire,
        down.componentId,
        down.pointId,
        depth + 1
      );
    }
    for (const w of circuit.wires) {
      if (w.id === wire.id) continue;
      if (w.fromComponentId === componentId && w.fromPointId === pointId) {
        return resolveLogicalWireEndpoint(
          circuit,
          wire,
          w.toComponentId,
          w.toPointId,
          depth + 1
        );
      }
    }
  }

  // Intermediate hop in a junction / connection-point chain (not this wire's end).
  if (!onFrom && !onTo) {
    const up = findUpstreamAtTap(circuit, wire.id, componentId, pointId);
    if (up) {
      return resolveLogicalWireEndpoint(
        circuit,
        wire,
        up.componentId,
        up.pointId,
        depth + 1
      );
    }
  }

  return { componentId, pointId };
}

/**
 * Designator from endpoints: `{fromLabel}{fromTerminal}-{toLabel}{toTerminal}`
 * (e.g. `Q1Lout-Q3Lin`). Passthrough taps resolve to upstream/downstream devices.
 */
export function deriveEndpointWireNumber(circuit: Circuit, wire: Wire): string {
  const fromResolved = resolveLogicalWireEndpoint(
    circuit,
    wire,
    wire.fromComponentId,
    wire.fromPointId
  );
  const toResolved = resolveLogicalWireEndpoint(
    circuit,
    wire,
    wire.toComponentId,
    wire.toPointId
  );

  const fc = circuit.components.find((c) => c.id === fromResolved.componentId);
  const tc = circuit.components.find((c) => c.id === toResolved.componentId);
  const fp = fc?.connectionPoints.find((p) => p.id === fromResolved.pointId);
  const tp = tc?.connectionPoints.find((p) => p.id === toResolved.pointId);

  const fromName = safeNamePart(componentTitle(fc));
  const toName = safeNamePart(componentTitle(tc));
  const fromT = formatTerminalTag(fp?.label ?? '?');
  const toT = formatTerminalTag(tp?.label ?? '?');
  return `${fromName}${fromT}-${toName}${toT}`;
}

/** Recompute `wireNumber` for every wire with `wireNumberAuto === true`. */
export function refreshAutoWireNumbers(circuit: Circuit): Circuit {
  return {
    ...circuit,
    wires: circuit.wires.map((w) => {
      if (w.wireNumberAuto !== true) return w;
      return {
        ...w,
        wireNumber: deriveEndpointWireNumber(circuit, w),
      };
    }),
  };
}
