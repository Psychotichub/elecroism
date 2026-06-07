import type { Circuit, CircuitComponent, SimulationResult } from '../types';
import { engine } from '../simulation/engine';
import { terminalKey } from '../simulation/engineTypes';
import {
  conductorResistanceOhms,
  wireLengthMeters,
} from '../simulation/cableImpedance';
import { DEFAULT_ZE_OHMS } from './earthFaultLoopValidation';
import { PROSPECTIVE_SHORT_CIRCUIT_A } from './shortCircuitValidation';
const PROTECTION_DEVICE_TYPES = new Set<CircuitComponent['type']>([
  'mcb',
  'three_phase_mcb',
  'mccb',
  'motor_protection_circuit_breaker',
  'four_phase_mcb',
  'motorized_mccb',
  'four_pole_motorized_mccb',
  'hrc_fuse',
  'control_circuit_fuse',
  'air_circuit_breaker',
  'rcd',
  'residual_current_circuit_breaker',
]);

export type FaultLevelRow = {
  deviceId: string;
  label: string;
  deviceType: string;
  voltageV: number;
  sourceImpedanceOhms: number;
  faultCurrentA: number;
};

function labelNorm(l: string): string {
  return l.trim().toUpperCase();
}

function collectLiveSeeds(circuit: Circuit): Set<string> {
  const live = new Set<string>();
  for (const c of circuit.components) {
    for (const p of c.connectionPoints) {
      const L = labelNorm(p.label);
      const k = terminalKey(c.id, p.id);
      if (c.type === 'power_source' && L === 'L_OUT') live.add(k);
      if (
        c.type === 'three_phase_source' &&
        (L === 'L1_OUT' || L === 'L2_OUT' || L === 'L3_OUT')
      ) {
        live.add(k);
      }
    }
  }
  return live;
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

function deviceLineInputKeys(c: CircuitComponent): string[] {
  const keys: string[] = [];
  for (const p of c.connectionPoints) {
    const L = labelNorm(p.label);
    if (L === '1' || L === 'IN' || L.startsWith('IN_')) {
      keys.push(terminalKey(c.id, p.id));
    }
  }
  if (c.type === 'mcb' && keys.length === 0) {
    const one = c.connectionPoints.find((p) => p.label === '1');
    if (one) keys.push(terminalKey(c.id, one.id));
  }
  return keys;
}

function nominalVoltageV(circuit: Circuit, device: CircuitComponent): number {
  if (
    device.type === 'three_phase_mcb' ||
    device.type === 'four_phase_mcb' ||
    device.type === 'air_circuit_breaker'
  ) {
    const src = circuit.components.find((x) => x.type === 'three_phase_source');
    return src?.properties.lineVoltage ?? src?.properties.voltage ?? 400;
  }
  const src = circuit.components.find((x) => x.type === 'power_source');
  return src?.properties.voltage ?? 230;
}

/** Prospective bolted fault (A) from source impedance at a protection device. */
export function computeProspectiveBoltedFaultA(
  circuit: Circuit,
  graph: Map<string, Set<string>>,
  liveSeeds: Set<string>,
  device: CircuitComponent,
  simulationResult: SimulationResult | null
): number {
  const simI = simulationResult?.nodes[device.id]?.currentA ?? 0;
  const u0 =
    device.type === 'three_phase_mcb' || device.type === 'four_phase_mcb'
      ? nominalVoltageV(circuit, device) / Math.sqrt(3)
      : nominalVoltageV(circuit, device);

  const parent = bfsParentTree(graph, circuit, liveSeeds);
  let minZ = Infinity;
  for (const inKey of deviceLineInputKeys(device)) {
    const r = pathResistanceOhms(circuit, parent, inKey, liveSeeds);
    if (r === null) continue;
    const z = DEFAULT_ZE_OHMS + r;
    minZ = Math.min(minZ, z);
  }

  const fromZ =
    Number.isFinite(minZ) && minZ > 0 ? u0 / minZ : PROSPECTIVE_SHORT_CIRCUIT_A;
  return Math.max(simI, Math.min(fromZ, PROSPECTIVE_SHORT_CIRCUIT_A));
}

export function buildFaultLevelReport(
  circuit: Circuit,
  simulationResult: SimulationResult | null
): FaultLevelRow[] {
  const clone = structuredClone(circuit);
  const graph = engine.getTerminalGraphForValidation(clone);
  const liveSeeds = collectLiveSeeds(circuit);
  if (liveSeeds.size === 0) return [];

  const rows: FaultLevelRow[] = [];
  for (const c of circuit.components) {
    if (!PROTECTION_DEVICE_TYPES.has(c.type)) continue;
    if (c.state === 'off') continue;

    const parent = bfsParentTree(graph, circuit, liveSeeds);
    let minZ = Infinity;
    for (const inKey of deviceLineInputKeys(c)) {
      const r = pathResistanceOhms(circuit, parent, inKey, liveSeeds);
      if (r === null) continue;
      minZ = Math.min(minZ, DEFAULT_ZE_OHMS + r);
    }
    const z =
      Number.isFinite(minZ) && minZ > 0 ? minZ : DEFAULT_ZE_OHMS;
    const v = nominalVoltageV(circuit, c);
    const faultA = computeProspectiveBoltedFaultA(
      circuit,
      graph,
      liveSeeds,
      c,
      simulationResult
    );

    rows.push({
      deviceId: c.id,
      label: c.label?.trim() || c.type,
      deviceType: c.type.replace(/_/g, ' '),
      voltageV: v,
      sourceImpedanceOhms: z,
      faultCurrentA: faultA,
    });
  }

  return rows.sort((a, b) => b.faultCurrentA - a.faultCurrentA);
}

export function maxProspectiveFaultCurrentA(
  circuit: Circuit,
  simulationResult: SimulationResult | null
): number {
  const rows = buildFaultLevelReport(circuit, simulationResult);
  if (rows.length === 0) return PROSPECTIVE_SHORT_CIRCUIT_A;
  return Math.max(...rows.map((r) => r.faultCurrentA));
}

export function faultLevelsByDeviceId(
  circuit: Circuit,
  simulationResult: SimulationResult | null
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of buildFaultLevelReport(circuit, simulationResult)) {
    out[row.deviceId] = row.faultCurrentA;
  }
  return out;
}
