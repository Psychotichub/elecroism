import type { Circuit, CircuitComponent, SimulationResult } from '../types';
import { engine } from '../simulation/engine';
import {
  conductorResistanceOhms,
  wireLengthMeters,
} from '../simulation/cableImpedance';
import { terminalKey } from '../simulation/engineTypes';
import type { CircuitValidationIssue } from './circuitDesignValidation';

/** Typical Ze at origin of installation (Ω) — TN-C-S / TN-S transformer contribution. */
export const DEFAULT_ZE_OHMS = 0.35;

function collectSupplySeeds(circuit: Circuit): {
  live: Set<string>;
  neutral: Set<string>;
} {
  const live = new Set<string>();
  const neutral = new Set<string>();
  for (const c of circuit.components) {
    for (const p of c.connectionPoints) {
      const k = terminalKey(c.id, p.id);
      const L = p.label.trim().toUpperCase();
      if (c.type === 'power_source') {
        if (L === 'L_OUT') live.add(k);
        if (L === 'N_OUT') neutral.add(k);
      } else if (c.type === 'three_phase_source') {
        if (L === 'L1_OUT' || L === 'L2_OUT' || L === 'L3_OUT') live.add(k);
        if (L === 'N_OUT') neutral.add(k);
      }
    }
  }
  return { live, neutral };
}

const FINAL_CIRCUIT_TYPES = new Set<CircuitComponent['type']>([
  'lamp',
  'heater',
  'panel_heater',
  'cooling_fan',
  'generic_load',
  'socket',
  'motor',
  'indicator_lamp',
]);

const ZS_PROTECTION_TYPES = new Set<CircuitComponent['type']>([
  'mcb',
  'three_phase_mcb',
  'mccb',
  'motor_protection_circuit_breaker',
  'four_phase_mcb',
  'motorized_mccb',
  'four_pole_motorized_mccb',
  'hrc_fuse',
  'control_circuit_fuse',
  'rcd',
  'residual_current_circuit_breaker',
]);

export type EarthFaultLoopRow = {
  loadId: string;
  loadLabel: string;
  protectorId: string | null;
  protectorLabel: string | null;
  ratedAmps: number | null;
  tripCurve: string | null;
  zsOhms: number;
  zeOhms: number;
  r1Ohms: number;
  r2Ohms: number;
  maxZsOhms: number | null;
  faultCurrentA: number;
  disconnectionRule: '0.4s' | '5s';
  ok: boolean;
};

function labelNorm(l: string): string {
  return l.trim().toUpperCase();
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

type BfsParent = Map<string, { prev: string; wireId: string | null }>;

function bfsParentTree(
  graph: Map<string, Set<string>>,
  circuit: Circuit,
  starts: Set<string>
): BfsParent {
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
  parent: BfsParent,
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

function loadLiveKey(c: CircuitComponent): string | null {
  if (c.type === 'socket' || c.type === 'indicator_lamp') {
    const cp = c.connectionPoints.find((p) => labelNorm(p.label) === 'L');
    return cp ? terminalKey(c.id, cp.id) : null;
  }
  if (
    c.type === 'lamp' ||
    c.type === 'heater' ||
    c.type === 'motor' ||
    c.type === 'generic_load' ||
    c.type === 'panel_heater' ||
    c.type === 'cooling_fan'
  ) {
    const cp = c.connectionPoints.find((p) => labelNorm(p.label) === 'T1');
    return cp ? terminalKey(c.id, cp.id) : null;
  }
  return null;
}

function loadNeutralKey(c: CircuitComponent): string | null {
  if (c.type === 'socket' || c.type === 'indicator_lamp') {
    const cp = c.connectionPoints.find((p) => labelNorm(p.label) === 'N');
    return cp ? terminalKey(c.id, cp.id) : null;
  }
  if (
    c.type === 'lamp' ||
    c.type === 'heater' ||
    c.type === 'motor' ||
    c.type === 'generic_load' ||
    c.type === 'panel_heater' ||
    c.type === 'cooling_fan'
  ) {
    const cp = c.connectionPoints.find((p) => labelNorm(p.label) === 'T2');
    return cp ? terminalKey(c.id, cp.id) : null;
  }
  return null;
}

function protectorOutputKeys(c: CircuitComponent): string[] {
  const keys: string[] = [];
  for (const p of c.connectionPoints) {
    const L = labelNorm(p.label);
    if (L === '2' || L === 'OUT' || L.startsWith('OUT_')) {
      keys.push(terminalKey(c.id, p.id));
    }
  }
  if (keys.length > 0) return keys;
  if (c.type === 'mcb') {
    const two = c.connectionPoints.find((p) => p.label === '2');
    if (two) keys.push(terminalKey(c.id, two.id));
  }
  return keys;
}

function bfsDistances(
  graph: Map<string, Set<string>>,
  starts: string[]
): Map<string, number> {
  const dist = new Map<string, number>();
  const q = [...starts];
  for (const s of starts) {
    if (graph.has(s)) dist.set(s, 0);
  }
  let i = 0;
  while (i < q.length) {
    const k = q[i++];
    const d = dist.get(k)!;
    for (const nb of graph.get(k) ?? []) {
      if (!dist.has(nb)) {
        dist.set(nb, d + 1);
        q.push(nb);
      }
    }
  }
  return dist;
}

function findUpstreamProtector(
  circuit: Circuit,
  graph: Map<string, Set<string>>,
  liveSeeds: Set<string>,
  loadLiveKey: string
): CircuitComponent | null {
  const dist = bfsDistances(graph, [...liveSeeds]);
  const loadDist = dist.get(loadLiveKey);
  if (loadDist === undefined) return null;

  let best: CircuitComponent | null = null;
  let bestOutDist = -1;

  for (const c of circuit.components) {
    if (!ZS_PROTECTION_TYPES.has(c.type)) continue;
    if (c.state === 'off' || c.state === 'tripped') continue;
    const outs = protectorOutputKeys(c);
    if (outs.length === 0) continue;
    let outDist = Infinity;
    for (const ok of outs) {
      const d = dist.get(ok);
      if (d !== undefined && d < outDist) outDist = d;
    }
    if (!Number.isFinite(outDist) || outDist >= loadDist) continue;
    if (outDist > bestOutDist) {
      bestOutDist = outDist;
      best = c;
    }
  }
  return best;
}

/**
 * BS 7671-style maximum loop impedance for MCB magnetic trip (0.4 s).
 * Type B: 5×In, C: 10×In, D: 20×In.
 */
export function maxZsForMcb(
  ratedAmps: number,
  tripCurve: 'B' | 'C' | 'D',
  u0 = 230,
  disconnectionS: 0.4 | 5 = 0.4
): number {
  if (ratedAmps <= 0) return 0;
  const mult = tripCurve === 'B' ? 5 : tripCurve === 'C' ? 10 : 20;
  const base = u0 / (mult * ratedAmps);
  return disconnectionS <= 0.4 ? base : base * 5;
}

function maxZsForProtector(
  c: CircuitComponent,
  u0: number,
  rule: '0.4s' | '5s'
): number | null {
  const rated = c.properties.ratingAmps;
  if (rated == null || rated <= 0) return null;
  if (c.type === 'hrc_fuse' || c.type === 'control_circuit_fuse') {
    const base = u0 / (4 * rated);
    return rule === '0.4s' ? base : base * 5;
  }
  const curve = (c.properties.tripCurve ?? 'C');
  return maxZsForMcb(rated, curve, u0, rule === '0.4s' ? 0.4 : 5);
}

function nominalU0(circuit: Circuit): number {
  const src = circuit.components.find((c) => c.type === 'power_source');
  return src?.properties.voltage ?? 230;
}

export function buildEarthFaultLoopReport(
  circuit: Circuit,
  simulationResult: SimulationResult | null,
  zeOhms = DEFAULT_ZE_OHMS
): EarthFaultLoopRow[] {
  const clone = structuredClone(circuit);
  const graph = engine.getTerminalGraphForValidation(clone);
  const { live: liveSeeds, neutral: neutralSeeds } = collectSupplySeeds(circuit);
  if (liveSeeds.size === 0 || neutralSeeds.size === 0) return [];

  const liveParent = bfsParentTree(graph, circuit, liveSeeds);
  const neutralParent = bfsParentTree(graph, circuit, neutralSeeds);
  const u0 = nominalU0(circuit);
  const rows: EarthFaultLoopRow[] = [];

  for (const load of circuit.components) {
    if (!FINAL_CIRCUIT_TYPES.has(load.type)) continue;
    const node = simulationResult?.nodes[load.id];
    if (simulationResult && !node?.energized) continue;

    const lk = loadLiveKey(load);
    const nk = loadNeutralKey(load);
    if (!lk || !nk) continue;

    const r1 = pathResistanceOhms(circuit, liveParent, lk, liveSeeds);
    const r2 = pathResistanceOhms(circuit, neutralParent, nk, neutralSeeds);
    if (r1 === null || r2 === null) continue;

    const zs = zeOhms + r1 + r2;
    const protector = findUpstreamProtector(circuit, graph, liveSeeds, lk);
    const rated = protector?.properties.ratingAmps ?? null;
    const tripCurve =
      protector?.type === 'hrc_fuse'
        ? protector.properties.hrcType ?? 'gG'
        : protector?.properties.tripCurve ?? null;

    const loadDist = bfsDistances(graph, [...liveSeeds]).get(lk) ?? 99;
    const rule: '0.4s' | '5s' =
      rated != null && rated <= 32 && loadDist <= 8 ? '0.4s' : '5s';

    const maxZs = protector ? maxZsForProtector(protector, u0, rule) : null;
    const ifault = zs > 0 ? u0 / zs : 0;
    const ok = maxZs == null || zs <= maxZs * 1.02;

    rows.push({
      loadId: load.id,
      loadLabel: load.label?.trim() || load.type,
      protectorId: protector?.id ?? null,
      protectorLabel: protector?.label?.trim() ?? null,
      ratedAmps: rated,
      tripCurve: tripCurve != null ? String(tripCurve) : null,
      zsOhms: zs,
      zeOhms,
      r1Ohms: r1,
      r2Ohms: r2,
      maxZsOhms: maxZs,
      faultCurrentA: ifault,
      disconnectionRule: rule,
      ok,
    });
  }

  return rows.sort((a, b) => a.loadLabel.localeCompare(b.loadLabel));
}

export function validateEarthFaultLoop(
  circuit: Circuit,
  simulationResult: SimulationResult | null
): CircuitValidationIssue[] {
  const issues: CircuitValidationIssue[] = [];
  const u0 = nominalU0(circuit);

  for (const row of buildEarthFaultLoopReport(circuit, simulationResult)) {
    if (row.maxZsOhms == null) continue;

    if (!row.ok) {
      issues.push({
        id: `zs-over-${row.loadId}`,
        severity: 'error',
        message: `"${row.loadLabel}": earth-fault loop Zs ≈ ${row.zsOhms.toFixed(2)} Ω exceeds max ${row.maxZsOhms.toFixed(2)} Ω for ${row.protectorLabel ?? 'protector'} (${row.ratedAmps} A, ${row.tripCurve ?? '—'}, ${row.disconnectionRule}) — automatic disconnection may not meet BS 7671 / IEC 60364.`,
        componentIds: [row.loadId, ...(row.protectorId ? [row.protectorId] : [])],
      });
      continue;
    }

    const ia =
      row.ratedAmps != null && row.tripCurve
        ? (row.tripCurve === 'B'
            ? 5
            : row.tripCurve === 'C'
              ? 10
              : row.tripCurve === 'D'
                ? 20
                : 10) * row.ratedAmps
        : row.ratedAmps != null
          ? 4 * row.ratedAmps
          : null;

    if (
      ia != null &&
      row.faultCurrentA < ia * 0.98 &&
      row.disconnectionRule === '0.4s'
    ) {
      issues.push({
        id: `zs-slow-${row.loadId}`,
        severity: 'warning',
        message: `"${row.loadLabel}": prospective earth-fault current ${row.faultCurrentA.toFixed(0)} A may be below magnetic trip (~${ia.toFixed(0)} A) — disconnection within 0.4 s not assured.`,
        componentIds: [row.loadId, ...(row.protectorId ? [row.protectorId] : [])],
      });
    } else if (row.zsOhms > row.maxZsOhms * 0.85) {
      issues.push({
        id: `zs-margin-${row.loadId}`,
        severity: 'warning',
        message: `"${row.loadLabel}": Zs ${row.zsOhms.toFixed(2)} Ω is close to limit ${row.maxZsOhms.toFixed(2)} Ω (${((row.zsOhms / row.maxZsOhms) * 100).toFixed(0)}% of max) at ${u0} V.`,
        componentIds: [row.loadId],
      });
    }
  }

  return issues;
}
