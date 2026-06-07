import type { Circuit, CircuitComponent } from '../types';
import { terminalKey } from '../simulation/engineTypes';
import {
  conductorResistanceOhms,
  wireLengthMeters,
} from '../simulation/cableImpedance';
import { listDcSources } from '../simulation/dcPowerPaths';

export type DcFaultRow = {
  componentId: string;
  label: string;
  sourceKind: string;
  voltageV: number;
  internalResistanceOhms: number;
  boltedFaultCurrentA: number;
};

/** Simplified internal resistance (Ω) for a battery string. */
export function batteryInternalResistanceOhms(c: CircuitComponent): number {
  if (c.properties.batteryInternalResistance_mOhm != null) {
    return Math.max(0.001, c.properties.batteryInternalResistance_mOhm / 1000);
  }
  const ah = Math.max(1, c.properties.batteryCapacityAh ?? 7);
  // Lead-acid / VRLA order-of-magnitude: lower R for larger packs
  return Math.max(0.005, 0.08 / Math.sqrt(ah));
}

export function dcSourceInternalResistanceOhms(c: CircuitComponent): number {
  if (c.properties.batteryInternalResistance_mOhm != null) {
    return Math.max(0.001, c.properties.batteryInternalResistance_mOhm / 1000);
  }
  if (c.type === 'dc_battery_backup') {
    return batteryInternalResistanceOhms(c);
  }
  // Bench / charger output — stiff supply
  return 0.05;
}

function findWireBetween(
  circuit: Circuit,
  a: string,
  b: string
): { wireId: string } | null {
  for (const w of circuit.wires) {
    const fk = terminalKey(w.fromComponentId, w.fromPointId);
    const tk = terminalKey(w.toComponentId, w.toPointId);
    if ((fk === a && tk === b) || (fk === b && tk === a)) {
      return { wireId: w.id };
    }
  }
  return null;
}

function bfsParentTree(
  graph: Map<string, Set<string>>,
  circuit: Circuit,
  starts: Set<string>
): Map<string, { prev: string; wireId: string | null }> {
  const parent = new Map<string, { prev: string; wireId: string | null }>();
  const queue: string[] = [];
  for (const s of starts) {
    if (!graph.has(s)) continue;
    parent.set(s, { prev: s, wireId: null });
    queue.push(s);
  }
  let i = 0;
  while (i < queue.length) {
    const k = queue[i++];
    for (const nb of graph.get(k) ?? []) {
      if (parent.has(nb)) continue;
      const wire = findWireBetween(circuit, k, nb);
      parent.set(nb, { prev: k, wireId: wire?.wireId ?? null });
      queue.push(nb);
    }
  }
  return parent;
}

function pathResistanceOhms(
  circuit: Circuit,
  parent: Map<string, { prev: string; wireId: string | null }>,
  endKey: string,
  startKeys: Set<string>
): number | null {
  if (!parent.has(endKey)) return null;
  let r = 0;
  let k = endKey;
  while (!startKeys.has(k)) {
    const step = parent.get(k);
    if (!step || step.prev === k) break;
    if (step.wireId) {
      const w = circuit.wires.find((x) => x.id === step.wireId);
      if (w) {
        r += conductorResistanceOhms(
          w.crossSection,
          wireLengthMeters(w.points, circuit.gridSize)
        );
      }
    }
    k = step.prev;
  }
  return startKeys.has(k) ? r : null;
}

/** Bolted fault current (A) at DC source terminals (simplified). */
export function boltedDcFaultCurrentA(c: CircuitComponent): number {
  const v = c.properties.voltage ?? 24;
  const r = dcSourceInternalResistanceOhms(c);
  return r > 0 ? v / r : 0;
}

export function buildDcFaultReport(circuit: Circuit): DcFaultRow[] {
  const rows: DcFaultRow[] = [];
  for (const src of listDcSources(circuit)) {
    const c = circuit.components.find((x) => x.id === src.componentId);
    if (!c) continue;
    if (c.type !== 'dc_power_source' && c.type !== 'dc_battery_backup') continue;
    const rInt = dcSourceInternalResistanceOhms(c);
    const iBolted = boltedDcFaultCurrentA(c);
    rows.push({
      componentId: c.id,
      label: c.label,
      sourceKind: src.kind,
      voltageV: src.voltageV,
      internalResistanceOhms: Math.round(rInt * 1000) / 1000,
      boltedFaultCurrentA: Math.round(iBolted),
    });
  }
  return rows;
}

export function dcFaultLevelsByComponentId(
  circuit: Circuit,
  graph: Map<string, Set<string>>
): Record<string, number> {
  const levels: Record<string, number> = {};
  for (const c of circuit.components) {
    if (c.type !== 'dc_power_source' && c.type !== 'dc_battery_backup') continue;
    if (c.state === 'off' || c.state === 'tripped') continue;
    levels[c.id] = boltedDcFaultCurrentA(c);
  }

  const plusStarts = new Set<string>();
  for (const c of circuit.components) {
    if (c.type !== 'dc_power_source' && c.type !== 'dc_battery_backup') continue;
    if (c.state === 'off' || c.state === 'tripped') continue;
    for (const cp of c.connectionPoints) {
      const u = cp.label.toUpperCase();
      if (u.includes('PLUS') || u.includes('POS') || u === 'DC_PLUS' || u === 'BAT_POS') {
        plusStarts.add(terminalKey(c.id, cp.id));
      }
    }
  }
  if (plusStarts.size === 0) return levels;

  const parent = bfsParentTree(graph, circuit, plusStarts);
  for (const c of circuit.components) {
    if (!isDcProtectionDevice(c.type)) continue;
    const inTerm = c.connectionPoints.find((p) =>
      /^(1|IN|IN_PLUS|DC_IN)$/i.test(p.label.trim())
    );
    const term = inTerm ?? c.connectionPoints[0];
    if (!term) continue;
    const endKey = terminalKey(c.id, term.id);
    let best = 0;
    for (const src of circuit.components) {
      if (src.type !== 'dc_power_source' && src.type !== 'dc_battery_backup') continue;
      if (src.state === 'off' || src.state === 'tripped') continue;
      const srcPlus = src.connectionPoints.find((p) => {
        const u = p.label.toUpperCase();
        return u.includes('PLUS') || u.includes('POS') || u === 'BAT_POS';
      });
      if (!srcPlus) continue;
      const startKey = terminalKey(src.id, srcPlus.id);
      const pathR = pathResistanceOhms(circuit, parent, endKey, new Set([startKey]));
      if (pathR == null) continue;
      const v = src.properties.voltage ?? 24;
      const rTotal = dcSourceInternalResistanceOhms(src) + pathR;
      best = Math.max(best, rTotal > 0 ? v / rTotal : 0);
    }
    if (best > 0) levels[c.id] = Math.round(best);
  }
  return levels;
}

function isDcProtectionDevice(type: CircuitComponent['type']): boolean {
  return (
    type === 'mcb' ||
    type === 'control_circuit_fuse' ||
    type === 'hrc_fuse'
  );
}

export function maxDcFaultCurrentA(
  circuit: Circuit,
  graph?: Map<string, Set<string>>
): number {
  const base = buildDcFaultReport(circuit);
  let max = base.reduce((m, r) => Math.max(m, r.boltedFaultCurrentA), 0);
  if (graph) {
    const levels = dcFaultLevelsByComponentId(circuit, graph);
    for (const i of Object.values(levels)) max = Math.max(max, i);
  }
  return max;
}

export interface DcFaultValidationIssue {
  id: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  componentIds: string[];
}

export function validateDcFaultLevels(
  circuit: Circuit,
  graph: Map<string, Set<string>>
): DcFaultValidationIssue[] {
  const issues: DcFaultValidationIssue[] = [];
  const rows = buildDcFaultReport(circuit);
  for (const row of rows) {
    if (row.boltedFaultCurrentA > 500) {
      issues.push({
        id: `dc-fault-high-${row.componentId}`,
        severity: 'warning',
        message: `DC source "${row.label}": estimated bolted fault ≈${row.boltedFaultCurrentA} A at ${row.voltageV} V — verify DC fuse/MCB rating and cable I²t.`,
        componentIds: [row.componentId],
      });
    }
  }
  for (const c of circuit.components) {
    if (c.type !== 'ups_module') continue;
    const mainsFuse = c.properties.upsInverterEnabled === false;
    const noBypass = !c.properties.upsStaticBypass;
    if (mainsFuse && noBypass) {
      issues.push({
        id: `ups-no-inverter-${c.id}`,
        severity: 'info',
        message: `"${c.label}" UPS: inverter disabled and no static bypass — load will drop on mains failure unless battery path is wired.`,
        componentIds: [c.id],
      });
    }
  }
  const levels = dcFaultLevelsByComponentId(circuit, graph);
  for (const c of circuit.components) {
    if (!isDcProtectionDevice(c.type)) continue;
    const i = levels[c.id];
    const rating = c.properties.ratingAmps ?? 0;
    if (i != null && rating > 0 && i > rating * 3) {
      issues.push({
        id: `dc-prot-undersized-${c.id}`,
        severity: 'warning',
        message: `"${c.label}" (${rating} A): prospective DC fault ≈${Math.round(i)} A exceeds 3× rating — consider higher breaking capacity.`,
        componentIds: [c.id],
      });
    }
  }
  return issues;
}
