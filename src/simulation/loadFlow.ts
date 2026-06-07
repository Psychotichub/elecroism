import type { Circuit, CircuitComponent, NodeResult, Wire } from '../types';
import type { PotentialSets } from './engineTypes';
import {
  splitTerminalKey,
  terminalKey,
  linePotentialAt,
} from './engineTypes';
import { isLoadComponent } from './componentClassification';
import {
  defaultSinglePhaseLoadVoltage,
  getDefaultThreePhaseLineVoltage,
} from './potentials';
import { getPowerFactor } from './threePhaseCalc';
import { effectiveImpedanceOhms, wireLengthMeters } from './cableImpedance';

export type LoadFlowSummary = {
  terminalVoltages: Map<string, number>;
  maxVoltageDropPct: number;
  adjustedLoads: number;
};

type NetworkKind = 'live' | 'neutral' | 'l1' | 'l2' | 'l3';

function terminalInNetwork(
  key: string,
  kind: NetworkKind,
  potentials: PotentialSets
): boolean {
  switch (kind) {
    case 'live':
      return potentials.live.has(key);
    case 'neutral':
      return potentials.neutral.has(key);
    case 'l1':
      return potentials.liveL1.has(key);
    case 'l2':
      return potentials.liveL2.has(key);
    case 'l3':
      return potentials.liveL3.has(key);
  }
}

function findWireBetween(
  circuit: Circuit,
  a: string,
  b: string
): Wire | null {
  for (const w of circuit.wires) {
    const fk = terminalKey(w.fromComponentId, w.fromPointId);
    const tk = terminalKey(w.toComponentId, w.toPointId);
    if ((fk === a && tk === b) || (fk === b && tk === a)) return w;
  }
  return null;
}

function sourceAnchors(
  circuit: Circuit,
  kind: NetworkKind
): { key: string; voltageV: number }[] {
  const anchors: { key: string; voltageV: number }[] = [];
  for (const c of circuit.components) {
    if (c.state === 'off' || c.state === 'tripped') continue;
    if (c.type === 'power_source' && (kind === 'live' || kind === 'neutral')) {
      const v = c.properties.voltage ?? 230;
      for (const cp of c.connectionPoints) {
        const tokens = cp.label.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
        const key = terminalKey(c.id, cp.id);
        if (kind === 'live' && (tokens.includes('L') || tokens.includes('LINE'))) {
          anchors.push({ key, voltageV: v });
        } else if (kind === 'neutral' && (tokens.includes('N') || tokens.includes('NEUTRAL'))) {
          anchors.push({ key, voltageV: 0 });
        }
      }
    }
    if (c.type === 'three_phase_source' && kind !== 'live' && kind !== 'neutral') {
      const vLl = c.properties.lineVoltage ?? c.properties.voltage ?? 400;
      const vPh = vLl / Math.sqrt(3);
      const phaseToken = kind === 'l1' ? 'L1' : kind === 'l2' ? 'L2' : 'L3';
      for (const cp of c.connectionPoints) {
        if (cp.label.toUpperCase().includes(phaseToken)) {
          anchors.push({ key: terminalKey(c.id, cp.id), voltageV: vPh });
        }
      }
    }
    if (c.type === 'three_phase_source' && kind === 'neutral') {
      for (const cp of c.connectionPoints) {
        if (cp.label.toUpperCase().includes('N')) {
          anchors.push({ key: terminalKey(c.id, cp.id), voltageV: 0 });
        }
      }
    }
    if (c.type === 'dc_power_source' || c.type === 'dc_battery_backup') {
      for (const cp of c.connectionPoints) {
        const u = cp.label.toUpperCase();
        const key = terminalKey(c.id, cp.id);
        if (kind === 'live' && (u.includes('PLUS') || u.includes('POS'))) {
          anchors.push({ key, voltageV: c.properties.voltage ?? 24 });
        } else if (kind === 'neutral' && (u.includes('MINUS') || u.includes('NEG'))) {
          anchors.push({ key, voltageV: 0 });
        }
      }
    }
  }
  return anchors;
}

class UnionFind {
  private root = new Map<string, string>();

  find(x: string): string {
    if (!this.root.has(x)) this.root.set(x, x);
    let r = x;
    while (this.root.get(r) !== r) r = this.root.get(r)!;
    let c = x;
    while (c !== r) {
      const n = this.root.get(c)!;
      this.root.set(c, r);
      c = n;
    }
    return r;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.root.set(rb, ra);
  }
}

function networkTerminals(
  graph: Map<string, Set<string>>,
  potentials: PotentialSets,
  kind: NetworkKind
): Set<string> {
  const out = new Set<string>();
  for (const k of graph.keys()) {
    if (terminalInNetwork(k, kind, potentials)) out.add(k);
    for (const nb of graph.get(k) ?? []) {
      if (terminalInNetwork(nb, kind, potentials)) out.add(nb);
    }
  }
  return out;
}

function buildLoadInjections(
  circuit: Circuit,
  nodes: Record<string, NodeResult>,
  potentials: PotentialSets,
  kind: NetworkKind
): Map<string, number> {
  const inj = new Map<string, number>();
  for (const c of circuit.components) {
    if (!isLoadComponent(c)) continue;
    const node = nodes[c.id];
    if (!node?.energized) continue;

    let keys: (string | null)[] = [];
    if (kind === 'live') keys = [liveTerminalForLoad(c)];
    else if (kind === 'neutral') keys = [neutralTerminalForLoad(c)];
    else if (kind === 'l1') keys = [phaseTerminal(c, 1)];
    else if (kind === 'l2') keys = [phaseTerminal(c, 2)];
    else if (kind === 'l3') keys = [phaseTerminal(c, 3)];

    const i =
      c.type === 'three_phase_motor' &&
      c.properties.phaseSystem !== 'single_phase' &&
      kind !== 'live' &&
      kind !== 'neutral'
        ? node.currentA / Math.sqrt(3)
        : node.currentA;

    for (const key of keys) {
      if (!key || !terminalInNetwork(key, kind, potentials)) continue;
      inj.set(key, (inj.get(key) ?? 0) - i);
    }
  }
  return inj;
}

function solveLinearSystem(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
    }
    if (Math.abs(m[pivot][col]) < 1e-12) return null;
    if (pivot !== col) [m[col], m[pivot]] = [m[pivot], m[col]];
    const div = m[col][col];
    for (let j = col; j <= n; j++) m[col][j] /= div;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = m[row][col];
      if (Math.abs(factor) < 1e-15) continue;
      for (let j = col; j <= n; j++) m[row][j] -= factor * m[col][j];
    }
  }
  return m.map((row) => row[n]);
}

/**
 * Nodal admittance solve for one conductor network (handles parallel branches).
 * Source terminals are fixed; loads inject as current sinks.
 */
function solveNetworkVoltages(
  circuit: Circuit,
  graph: Map<string, Set<string>>,
  potentials: PotentialSets,
  kind: NetworkKind,
  pf: number,
  nodes: Record<string, NodeResult>
): Map<string, number> {
  const anchors = sourceAnchors(circuit, kind);
  const voltage = new Map<string, number>();
  if (anchors.length === 0) return voltage;

  const terms = networkTerminals(graph, potentials, kind);
  if (terms.size === 0) return voltage;

  const uf = new UnionFind();
  for (const t of terms) uf.find(t);
  for (const k of terms) {
    for (const nb of graph.get(k) ?? []) {
      if (!terms.has(nb)) continue;
      if (findWireBetween(circuit, k, nb)) continue;
      uf.union(k, nb);
    }
  }

  const superToTerminals = new Map<string, string[]>();
  for (const t of terms) {
    const s = uf.find(t);
    const list = superToTerminals.get(s) ?? [];
    list.push(t);
    superToTerminals.set(s, list);
  }

  const superIds = [...superToTerminals.keys()];
  const superIndex = new Map(superIds.map((id, i) => [id, i] as const));

  const fixedV = new Map<number, number>();
  for (const a of anchors) {
    const si = superIndex.get(uf.find(a.key));
    if (si !== undefined) fixedV.set(si, a.voltageV);
  }

  const conductance = new Map<string, number>();
  const addG = (a: number, b: number, g: number) => {
    if (a === b || g <= 0) return;
    const k1 = `${Math.min(a, b)}:${Math.max(a, b)}`;
    conductance.set(k1, (conductance.get(k1) ?? 0) + g);
  };

  for (const w of circuit.wires) {
    const fk = terminalKey(w.fromComponentId, w.fromPointId);
    const tk = terminalKey(w.toComponentId, w.toPointId);
    if (!terms.has(fk) || !terms.has(tk)) continue;
    const sa = superIndex.get(uf.find(fk));
    const sb = superIndex.get(uf.find(tk));
    if (sa === undefined || sb === undefined || sa === sb) continue;
    const lenM = wireLengthMeters(w.points, circuit.gridSize);
    const z = effectiveImpedanceOhms(w.crossSection, lenM, pf);
    if (z <= 1e-9) continue;
    addG(sa, sb, 1 / z);
  }

  const injections = buildLoadInjections(circuit, nodes, potentials, kind);
  const superInj = new Array(superIds.length).fill(0) as number[];
  for (const [key, i] of injections) {
    const si = superIndex.get(uf.find(key));
    if (si !== undefined) superInj[si] += i;
  }

  const unknown: number[] = [];
  for (let i = 0; i < superIds.length; i++) {
    if (!fixedV.has(i)) unknown.push(i);
  }

  const superV = new Array(superIds.length).fill(0) as number[];
  for (const [i, v] of fixedV) superV[i] = v;

  if (unknown.length > 0) {
    const n = unknown.length;
    const mat: number[][] = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => 0)
    );
    const rhs = new Array(n).fill(0) as number[];

    const getG = (a: number, b: number): number => {
      if (a === b) return 0;
      const k = `${Math.min(a, b)}:${Math.max(a, b)}`;
      return conductance.get(k) ?? 0;
    };

    for (let ui = 0; ui < n; ui++) {
      const ni = unknown[ui];
      let diag = 0;
      for (let vj = 0; vj < superIds.length; vj++) {
        const g = getG(ni, vj);
        if (g <= 0) continue;
        diag += g;
        const uj = unknown.indexOf(vj);
        if (uj >= 0) mat[ui][uj] -= g;
        else rhs[ui] += g * (superV[vj] ?? 0);
      }
      mat[ui][ui] += diag;
      rhs[ui] += superInj[ni] ?? 0;
    }

    const solved = solveLinearSystem(mat, rhs);
    if (solved) {
      for (let ui = 0; ui < n; ui++) {
        superV[unknown[ui]] = solved[ui]!;
      }
    }
  }

  for (const [superId, terminalList] of superToTerminals) {
    const si = superIndex.get(superId)!;
    const v = superV[si] ?? 0;
    for (const t of terminalList) voltage.set(t, v);
  }

  for (const w of circuit.wires) {
    const fk = terminalKey(w.fromComponentId, w.fromPointId);
    const tk = terminalKey(w.toComponentId, w.toPointId);
    if (!terms.has(fk) || !terms.has(tk)) continue;
    const va = voltage.get(fk);
    const vb = voltage.get(tk);
    if (va === undefined || vb === undefined) continue;
    const drop = Math.abs(va - vb);
    w.voltageDropV = Math.max(w.voltageDropV ?? 0, drop);
  }

  return voltage;
}

function liveTerminalForLoad(c: CircuitComponent): string | null {
  if (c.type === 'socket' || c.type === 'indicator_lamp') {
    const cp = c.connectionPoints.find((p) => p.label.toUpperCase() === 'L');
    return cp ? terminalKey(c.id, cp.id) : null;
  }
  if (
    c.type === 'lamp' ||
    c.type === 'heater' ||
    c.type === 'motor' ||
    c.type === 'generic_load'
  ) {
    const cp = c.connectionPoints.find((p) => p.label.toUpperCase() === 'T1');
    return cp ? terminalKey(c.id, cp.id) : null;
  }
  if (c.type === 'three_phase_motor') {
    const cp = c.connectionPoints.find((p) => p.label.toUpperCase() === 'L1');
    return cp ? terminalKey(c.id, cp.id) : null;
  }
  return null;
}

function neutralTerminalForLoad(c: CircuitComponent): string | null {
  if (c.type === 'socket' || c.type === 'indicator_lamp') {
    const cp = c.connectionPoints.find((p) => p.label.toUpperCase() === 'N');
    return cp ? terminalKey(c.id, cp.id) : null;
  }
  if (
    c.type === 'lamp' ||
    c.type === 'heater' ||
    c.type === 'motor' ||
    c.type === 'generic_load'
  ) {
    const cp = c.connectionPoints.find((p) => p.label.toUpperCase() === 'T2');
    return cp ? terminalKey(c.id, cp.id) : null;
  }
  if (c.type === 'three_phase_motor') {
    const cp = c.connectionPoints.find((p) => p.label.toUpperCase() === 'N');
    return cp ? terminalKey(c.id, cp.id) : null;
  }
  return null;
}

function phaseTerminal(c: CircuitComponent, phase: 1 | 2 | 3): string | null {
  const label = phase === 1 ? 'L1' : phase === 2 ? 'L2' : 'L3';
  const cp = c.connectionPoints.find((p) => p.label.toUpperCase() === label);
  return cp ? terminalKey(c.id, cp.id) : null;
}

/**
 * Apply impedance-based voltage drops after the topological solve and wire
 * currents are known. Updates load node voltages (constant-power recalc).
 */
export function applyImpedanceLoadFlow(
  circuit: Circuit,
  nodes: Record<string, NodeResult>,
  potentials: PotentialSets,
  graph: Map<string, Set<string>>
): LoadFlowSummary {
  for (const w of circuit.wires) {
    w.voltageDropV = 0;
  }

  const nominalV = defaultSinglePhaseLoadVoltage(circuit);
  const nominalLl = getDefaultThreePhaseLineVoltage(circuit);
  let maxDropPct = 0;
  let adjustedLoads = 0;

  const liveV = solveNetworkVoltages(circuit, graph, potentials, 'live', 0.95, nodes);
  const neutralV = solveNetworkVoltages(circuit, graph, potentials, 'neutral', 0.95, nodes);
  const l1V = solveNetworkVoltages(circuit, graph, potentials, 'l1', 0.85, nodes);
  const l2V = solveNetworkVoltages(circuit, graph, potentials, 'l2', 0.85, nodes);
  const l3V = solveNetworkVoltages(circuit, graph, potentials, 'l3', 0.85, nodes);
  const n3V = solveNetworkVoltages(circuit, graph, potentials, 'neutral', 0.85, nodes);

  const allTerminalV = new Map<string, number>([
    ...liveV,
    ...neutralV,
    ...l1V,
    ...l2V,
    ...l3V,
    ...n3V,
  ]);

  for (const c of circuit.components) {
    if (!isLoadComponent(c)) continue;
    const node = nodes[c.id];
    if (!node?.energized) continue;

    const pf = getPowerFactor(c);
    const p = c.properties.powerWatts ?? node.powerW ?? 0;

    if (c.type === 'three_phase_motor' && c.properties.phaseSystem !== 'single_phase') {
      const k1 = phaseTerminal(c, 1);
      const k2 = phaseTerminal(c, 2);
      const k3 = phaseTerminal(c, 3);
      const kn = neutralTerminalForLoad(c);
      if (!k1 || !k2 || !k3) continue;
      const v1 = (l1V.get(k1) ?? nominalLl / Math.sqrt(3)) - (kn ? n3V.get(kn) ?? 0 : 0);
      const v2 = (l2V.get(k2) ?? nominalLl / Math.sqrt(3)) - (kn ? n3V.get(kn) ?? 0 : 0);
      const v3 = (l3V.get(k3) ?? nominalLl / Math.sqrt(3)) - (kn ? n3V.get(kn) ?? 0 : 0);
      const vAvg = (v1 + v2 + v3) / 3;
      const vLl = vAvg * Math.sqrt(3);
      const i =
        p > 0 && vLl > 1
          ? p / (Math.sqrt(3) * vLl * Math.max(pf, 0.05))
          : node.currentA;
      const dropPct = ((nominalLl - vLl) / nominalLl) * 100;
      maxDropPct = Math.max(maxDropPct, Math.max(0, dropPct));
      nodes[c.id] = {
        ...node,
        voltageV: vLl,
        lineVoltageRmsV: vLl,
        phaseVoltageRmsV: vAvg,
        voltageL1NV: v1,
        voltageL2NV: v2,
        voltageL3NV: v3,
        currentA: i,
        lineCurrentRmsA: i,
        powerW: p,
        powerVA: vLl * i * Math.sqrt(3),
      };
      adjustedLoads += 1;
      continue;
    }

    const kLive = liveTerminalForLoad(c);
    const kNeutral = neutralTerminalForLoad(c);
    if (!kLive) continue;

    const vLive =
      liveV.get(kLive) ??
      l1V.get(kLive) ??
      (linePotentialAt(potentials, kLive) ? nominalV : 0);
    const vNeut = kNeutral ? (neutralV.get(kNeutral) ?? n3V.get(kNeutral) ?? 0) : 0;
    const vLoad = Math.max(0, vLive - vNeut);
    const refV = nominalV > 0 ? nominalV : 230;
    const dropPct = ((refV - vLoad) / refV) * 100;
    maxDropPct = Math.max(maxDropPct, Math.max(0, dropPct));

    const i =
      p > 0 && vLoad > 1
        ? p / (vLoad * Math.max(pf, 0.05))
        : node.currentA;

    nodes[c.id] = {
      ...node,
      voltageV: vLoad,
      phaseVoltageRmsV: vLoad,
      currentA: i,
      powerW: p,
      powerVA: vLoad * i,
    };
    adjustedLoads += 1;
  }

  return {
    terminalVoltages: allTerminalV,
    maxVoltageDropPct: maxDropPct,
    adjustedLoads,
  };
}

/** Nominal voltage at a terminal key for drop-% display. */
export function nominalVoltageAtTerminal(
  circuit: Circuit,
  key: string
): number {
  const split = splitTerminalKey(key);
  if (!split) return 230;
  const c = circuit.components.find((x) => x.id === split.componentId);
  if (!c) return 230;
  if (c.type === 'three_phase_source') {
    return (c.properties.lineVoltage ?? 400) / Math.sqrt(3);
  }
  if (c.type === 'power_source') return c.properties.voltage ?? 230;
  if (c.type === 'dc_power_source') return c.properties.voltage ?? 24;
  return defaultSinglePhaseLoadVoltage(circuit);
}
