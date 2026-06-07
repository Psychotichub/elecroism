/**
 * Residual (earth-leakage) current for RCD / RCCB and ELR+CBCT devices.
 *
 * I_residual = |VectorSum(I_L1, I_L2, I_L3, I_N)| on the protected zone.
 * For 2P devices this reduces to imbalance between live-pole and neutral-pole
 * return currents (including MET/PE bypass paths).
 */

import type { Circuit, CircuitComponent, NodeResult } from '../types';
import { isLoadComponent } from './componentClassification';
import {
  bfsFrom,
  cloneTerminalGraph,
  findTerminalByLabel,
  keyPotentialTag,
  terminalKey,
  type PotentialSets,
} from './engineTypes';
import { getLoadLiveTerminalKey } from './potentials';
import {
  getPowerFactor,
  loadUsesThreePhaseBranchReachability,
  neutralCurrentRmsWyePhasor,
} from './threePhaseCalc';
import {
  singlePhaseNeutralHarmonicA,
  thdPercentOf,
} from './powerQuality';

export type ResidualCurrentOpts = {
  lnFaultAnchors?: Set<string>;
  branchCurrentA?: number;
};

function isResidualDevice(c: CircuitComponent): boolean {
  return (
    c.type === 'rcd' ||
    c.type === 'residual_current_circuit_breaker' ||
    c.type === 'earth_leakage_relay_cbct'
  );
}

/** Effective 2P vs 4P layout for an RCD / RCCB. */
export function rcdPoleCount(c: CircuitComponent): 2 | 4 {
  if (c.properties.poles === 4) return 4;
  const labs = new Set(c.connectionPoints.map((cp) => cp.label.trim()));
  if (labs.has('5') && labs.has('6')) return 4;
  if (c.connectionPoints.length >= 8) return 4;
  return 2;
}

function neutralTerminalKey(c: CircuitComponent): string | null {
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

function peTerminalKey(c: CircuitComponent): string | null {
  if (c.type === 'socket' || c.type === 'indicator_lamp') {
    const cp = c.connectionPoints.find((p) => p.label.toUpperCase() === 'PE');
    return cp ? terminalKey(c.id, cp.id) : null;
  }
  return null;
}

function lineCurrentA(c: CircuitComponent, node: NodeResult): number {
  return node.lineCurrentRmsA ?? node.fundamentalCurrentA ?? node.currentA ?? 0;
}

const UPSTREAM_POLE_PAIRS: [string, string][] = [
  ['2', '1'],
  ['4', '3'],
  ['6', '5'],
  ['8', '7'],
];

/** Graph with device input↔output bridges removed so BFS stays on the load side. */
function downstreamGraph(
  device: CircuitComponent,
  graph: Map<string, Set<string>>
): Map<string, Set<string>> {
  const g = cloneTerminalGraph(graph);
  for (const [outLabel, inLabel] of UPSTREAM_POLE_PAIRS) {
    const outK = findTerminalByLabel(device, outLabel);
    const inK = findTerminalByLabel(device, inLabel);
    if (!outK || !inK) continue;
    g.get(outK)?.delete(inK);
    g.get(inK)?.delete(outK);
  }
  return g;
}

function loadsOnPoleReach(
  circuit: Circuit,
  poleReach: Set<string>
): CircuitComponent[] {
  const out: CircuitComponent[] = [];
  for (const c of circuit.components) {
    if (!isLoadComponent(c)) continue;
    const liveKey = getLoadLiveTerminalKey(c);
    if (liveKey && poleReach.has(liveKey)) out.push(c);
  }
  return out;
}

function returnCurrentOnPoleReach(
  circuit: Circuit,
  poleReach: Set<string>,
  nodes: Record<string, NodeResult>
): number {
  let sum = 0;
  for (const c of circuit.components) {
    if (!isLoadComponent(c)) continue;
    const node = nodes[c.id];
    if (!node?.energized) continue;
    const i = lineCurrentA(c, node);
    if (i <= 0) continue;
    const nKey = neutralTerminalKey(c);
    const peKey = peTerminalKey(c);
    if (nKey && poleReach.has(nKey)) {
      sum += i;
      continue;
    }
    if (peKey && poleReach.has(peKey)) {
      const peOnEarthPath =
        poleReach.has(peKey);
      if (peOnEarthPath) sum += i;
    }
  }
  return sum;
}

function harmonicResidualA(c: CircuitComponent, node: NodeResult): number {
  const i = lineCurrentA(c, node);
  if (i <= 0) return 0;
  const thd = thdPercentOf(c);
  if (thd <= 0) return 0;
  if (
    c.type === 'three_phase_motor' &&
    c.properties.phaseSystem !== 'single_phase'
  ) {
    return singlePhaseNeutralHarmonicA(i, thd) * 3;
  }
  return singlePhaseNeutralHarmonicA(i, thd);
}

function lnFaultLeakageA(
  lnFaultAnchors: Set<string>,
  zoneReach: Set<string>,
  branchCurrentA: number
): number {
  if (lnFaultAnchors.size === 0 || branchCurrentA <= 0) return 0;
  for (const anchor of lnFaultAnchors) {
    if (zoneReach.has(anchor)) return branchCurrentA;
  }
  return 0;
}

/** 2P / 1P ELR: |I_live_pole − I_return_on_neutral_pole| + harmonics. */
function twoPoleResidualA(
  device: CircuitComponent,
  circuit: Circuit,
  nodes: Record<string, NodeResult>,
  graph: Map<string, Set<string>>
): number {
  const zoneGraph = downstreamGraph(device, graph);
  const liveOut = findTerminalByLabel(device, '2');
  const neutralOut = findTerminalByLabel(device, '4');
  if (!liveOut) return 0;

  const liveReach = bfsFrom(zoneGraph, [liveOut]);
  const neutralReach = neutralOut
    ? bfsFrom(zoneGraph, [neutralOut])
    : new Set<string>();

  let iLive = 0;
  let harmonic = 0;
  for (const c of loadsOnPoleReach(circuit, liveReach)) {
    const node = nodes[c.id];
    if (!node?.energized) continue;
    iLive += lineCurrentA(c, node);
    harmonic += harmonicResidualA(c, node);
  }

  const iReturn = returnCurrentOnPoleReach(circuit, neutralReach, nodes);
  return Math.abs(iLive - iReturn) + harmonic;
}

function threePhaseZoneResidualA(
  loads: CircuitComponent[],
  nodes: Record<string, NodeResult>,
  potentials: PotentialSets,
  includeNeutralPole: boolean
): number {
  let i1 = 0;
  let i2 = 0;
  let i3 = 0;
  let inVal = 0;
  let pf1 = 1;
  let pf2 = 1;
  let pf3 = 1;
  let harmonic = 0;

  for (const c of loads) {
    const node = nodes[c.id];
    if (!node?.energized) continue;
    const i = lineCurrentA(c, node);
    if (i <= 0) continue;
    harmonic += harmonicResidualA(c, node);

    if (loadUsesThreePhaseBranchReachability(c)) {
      const pf = getPowerFactor(c);
      i1 += i;
      i2 += i;
      i3 += i;
      pf1 = pf;
      pf2 = pf;
      pf3 = pf;
      continue;
    }

    const liveKey = getLoadLiveTerminalKey(c);
    if (!liveKey) continue;
    const tag = keyPotentialTag(potentials, liveKey);
    const pf = getPowerFactor(c);
    if (tag === 'L1') {
      i1 += i;
      pf1 = pf;
    } else if (tag === 'L2') {
      i2 += i;
      pf2 = pf;
    } else if (tag === 'L3') {
      i3 += i;
      pf3 = pf;
    } else if (tag === 'L') {
      i1 += i;
      pf1 = pf;
      if (includeNeutralPole) inVal += i;
    } else if (tag === 'N' && includeNeutralPole) {
      inVal += i;
    }
  }

  const phi1 = Math.acos(Math.min(1, Math.max(0.05, pf1)));
  const phi2 = Math.acos(Math.min(1, Math.max(0.05, pf2)));
  const phi3 = Math.acos(Math.min(1, Math.max(0.05, pf3)));
  const fundamental = neutralCurrentRmsWyePhasor(i1, i2, i3, phi1, phi2, phi3);
  const neutralLeg = includeNeutralPole ? inVal : 0;
  return fundamental + neutralLeg + harmonic;
}

function protectedZoneReach(
  device: CircuitComponent,
  graph: Map<string, Set<string>>
): Set<string> {
  const zoneGraph = downstreamGraph(device, graph);
  const starts: string[] = [];
  const liveOut = findTerminalByLabel(device, '2');
  if (liveOut) starts.push(liveOut);
  const neutralOut = findTerminalByLabel(device, '4');
  if (neutralOut) starts.push(neutralOut);
  for (const label of ['6', '8']) {
    const k = findTerminalByLabel(device, label);
    if (k) starts.push(k);
  }
  if (starts.length === 0) return new Set();
  return bfsFrom(zoneGraph, starts);
}

/**
 * RMS residual current (A) on the protected side of an RCD / RCCB / ELR.
 */
export function computeResidualCurrentA(
  device: CircuitComponent,
  circuit: Circuit,
  nodes: Record<string, NodeResult>,
  graph: Map<string, Set<string>>,
  potentials: PotentialSets,
  opts?: ResidualCurrentOpts
): number {
  if (!isResidualDevice(device)) return 0;
  if (device.state === 'off' || device.state === 'tripped') return 0;

  const zoneReach = protectedZoneReach(device, graph);
  if (zoneReach.size === 0) return 0;

  const lnAnchors = opts?.lnFaultAnchors ?? new Set<string>();
  const branchI = opts?.branchCurrentA ?? 0;
  const lnLeak = lnFaultLeakageA(lnAnchors, zoneReach, branchI);

  if (device.type === 'earth_leakage_relay_cbct') {
    const poles = device.properties.poles ?? 1;
    if (poles >= 3) {
      const zoneGraph = downstreamGraph(device, graph);
      const liveOut = findTerminalByLabel(device, '2');
      const liveReach = liveOut ? bfsFrom(zoneGraph, [liveOut]) : zoneReach;
      const loads = loadsOnPoleReach(circuit, liveReach);
      return threePhaseZoneResidualA(loads, nodes, potentials, false) + lnLeak;
    }
    return twoPoleResidualA(device, circuit, nodes, graph) + lnLeak;
  }

  const poles = rcdPoleCount(device);
  if (poles === 4) {
    const zoneGraph = downstreamGraph(device, graph);
    const liveOut = findTerminalByLabel(device, '2');
    const liveReach = liveOut ? bfsFrom(zoneGraph, [liveOut]) : zoneReach;
    const loads = loadsOnPoleReach(circuit, liveReach);
    return threePhaseZoneResidualA(loads, nodes, potentials, true) + lnLeak;
  }
  return twoPoleResidualA(device, circuit, nodes, graph) + lnLeak;
}

/** Residual current in milliamps. */
export function computeResidualCurrentMA(
  device: CircuitComponent,
  circuit: Circuit,
  nodes: Record<string, NodeResult>,
  graph: Map<string, Set<string>>,
  potentials: PotentialSets,
  opts?: ResidualCurrentOpts
): number {
  return computeResidualCurrentA(device, circuit, nodes, graph, potentials, opts) * 1000;
}
