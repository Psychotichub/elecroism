import type { Circuit, CircuitComponent } from '../types';

export type ConnectionIntegrityIssue =
  | {
      kind: 'unwired_terminal';
      componentId: string;
      pointId: string;
      label: string;
    }
  | {
      kind: 'floating_wire_end';
      wireId: string;
      end: 'from' | 'to';
      componentId: string;
      pointId: string;
      reason: string;
    };

export type ConnectionIntegritySummary = {
  totalTerminals: number;
  wiredTerminals: number;
  unwiredTerminalCount: number;
  wireCount: number;
  floatingWireEndCount: number;
  junctionCount: number;
  issues: ConnectionIntegrityIssue[];
};

/** Mechanical / annotation devices — terminals are optional anchors, not wiring points. */
const SKIP_UNWIRED_TYPES = new Set<CircuitComponent['type']>([
  'din_rail',
  'mounting_plate',
  'cable_duct',
  'busbar_support_insulator',
  'ferrule_cable_markers',
  'ms_gi_sheet_enclosure',
  'ip_rated_enclosure',
  'control_wiring',
  'power_cables',
]);

function terminalWireDegree(circuit: Circuit): Map<string, number> {
  const degree = new Map<string, number>();
  const bump = (componentId: string, pointId: string) => {
    const key = `${componentId}:${pointId}`;
    degree.set(key, (degree.get(key) ?? 0) + 1);
  };
  for (const w of circuit.wires) {
    bump(w.fromComponentId, w.fromPointId);
    bump(w.toComponentId, w.toPointId);
  }
  return degree;
}

function resolveEndpoint(
  circuit: Circuit,
  componentId: string,
  pointId: string
): { ok: true } | { ok: false; reason: string } {
  const comp = circuit.components.find((c) => c.id === componentId);
  if (!comp) return { ok: false, reason: 'missing component' };
  const pt = comp.connectionPoints.find((p) => p.id === pointId);
  if (!pt) return { ok: false, reason: 'missing terminal' };
  return { ok: true };
}

export function analyzeConnectionIntegrity(circuit: Circuit): ConnectionIntegritySummary {
  const degree = terminalWireDegree(circuit);
  const issues: ConnectionIntegrityIssue[] = [];
  let totalTerminals = 0;
  let wiredTerminals = 0;

  for (const comp of circuit.components) {
    if (SKIP_UNWIRED_TYPES.has(comp.type)) continue;
    for (const cp of comp.connectionPoints) {
      totalTerminals += 1;
      const key = `${comp.id}:${cp.id}`;
      const d = degree.get(key) ?? 0;
      if (d > 0) {
        wiredTerminals += 1;
      } else {
        issues.push({
          kind: 'unwired_terminal',
          componentId: comp.id,
          pointId: cp.id,
          label: cp.label,
        });
      }
    }
  }

  for (const w of circuit.wires) {
    const from = resolveEndpoint(circuit, w.fromComponentId, w.fromPointId);
    if (!from.ok) {
      issues.push({
        kind: 'floating_wire_end',
        wireId: w.id,
        end: 'from',
        componentId: w.fromComponentId,
        pointId: w.fromPointId,
        reason: from.reason,
      });
    }
    const to = resolveEndpoint(circuit, w.toComponentId, w.toPointId);
    if (!to.ok) {
      issues.push({
        kind: 'floating_wire_end',
        wireId: w.id,
        end: 'to',
        componentId: w.toComponentId,
        pointId: w.toPointId,
        reason: to.reason,
      });
    }
  }

  const junctionCount = circuit.components.filter(
    (c) => c.type === 'junction' || c.type === 'connection_point'
  ).length;

  return {
    totalTerminals,
    wiredTerminals,
    unwiredTerminalCount: issues.filter((i) => i.kind === 'unwired_terminal').length,
    wireCount: circuit.wires.length,
    floatingWireEndCount: issues.filter((i) => i.kind === 'floating_wire_end').length,
    junctionCount,
    issues,
  };
}
