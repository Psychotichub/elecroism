import type { Circuit, CircuitComponent, NodeResult, SimulationResult } from '../types';
import { CircuitEngine } from './engine';
import { engine } from './engine';
import { splitTerminalKey, terminalKey } from './engineTypes';
import {
  conductorResistanceOhms,
  wireLengthMeters,
} from './cableImpedance';
import { DEFAULT_ZE_OHMS } from '../utils/earthFaultLoopValidation';
import {
  getProtectionFaultMetrics,
  PROTECTION_DEVICE_TYPES,
  type ProtectionFaultMetrics,
} from '../utils/arcFlashAnalysis';
import {
  defaultSinglePhaseLoadVoltage,
  getDefaultThreePhaseLineVoltage,
} from './potentials';
import { computeMotorThermalTimeline } from './motorThermal';
import type { MotorThermalReading } from './motorThermal';
import { buildAtsTransferTimeline } from './atsTransferSequence';

export type ScopeSampleNode = Pick<
  NodeResult,
  'voltageV' | 'currentA' | 'powerW' | 'energized'
>;

export type TimelineSample = {
  timeMs: number;
  nodes: Record<string, ScopeSampleNode>;
  motorThermal?: Record<string, MotorThermalReading>;
  atsPhase?: string;
  atsPhaseLabel?: string;
};

export type TimelineScenario = 'normal' | 'fault_clearing' | 'ats_transfer';

export type TimelineOptions = {
  durationMs?: number;
  stepMs?: number;
  startWallMs?: number;
  scenario?: TimelineScenario;
  faultDeviceId?: string;
};

const DEFAULT_DURATION_MS = 5000;
const DEFAULT_STEP_MS = 50;
const FAULT_DURATION_MS = 300;
const FAULT_STEP_MS = 1;
const INRUSH_TAU_MS = 600;
const INRUSH_PEAK_MULT = 5;

function labelNorm(l: string): string {
  return l.trim().toUpperCase();
}

function pickScopeNodes(result: SimulationResult): Record<string, ScopeSampleNode> {
  const out: Record<string, ScopeSampleNode> = {};
  for (const [id, n] of Object.entries(result.nodes)) {
    out[id] = {
      voltageV: n.voltageV,
      currentA: n.currentA,
      powerW: n.powerW,
      energized: n.energized,
    };
  }
  return out;
}

function cloneScopeNodes(
  nodes: Record<string, ScopeSampleNode>
): Record<string, ScopeSampleNode> {
  const out: Record<string, ScopeSampleNode> = {};
  for (const [id, n] of Object.entries(nodes)) {
    out[id] = { ...n };
  }
  return out;
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

function motorLiveTerminalKey(c: CircuitComponent): string | null {
  if (c.type === 'motor') {
    const cp = c.connectionPoints.find((p) => p.label.toUpperCase() === 'T1');
    return cp ? terminalKey(c.id, cp.id) : null;
  }
  if (c.type === 'three_phase_motor') {
    const cp = c.connectionPoints.find((p) => p.label.toUpperCase() === 'L1');
    return cp ? terminalKey(c.id, cp.id) : null;
  }
  return null;
}

function feederResistanceByMotorId(circuit: Circuit): Map<string, number> {
  const graph = engine.getTerminalGraphForValidation(structuredClone(circuit));
  const liveSeeds = collectLiveSeeds(circuit);
  const parent = bfsParentTree(graph, circuit, liveSeeds);
  const out = new Map<string, number>();

  for (const c of circuit.components) {
    if (c.type !== 'motor' && c.type !== 'three_phase_motor') continue;
    const liveKey = motorLiveTerminalKey(c);
    if (!liveKey) continue;
    const r = pathResistanceOhms(circuit, parent, liveKey, liveSeeds);
    if (r !== null) out.set(c.id, r + DEFAULT_ZE_OHMS);
  }
  return out;
}

function inrushMultiplierAt(dtMs: number): number {
  return 1 + INRUSH_PEAK_MULT * Math.exp(-dtMs / INRUSH_TAU_MS);
}

/** Scale motor current/power for starting inrush decay (≈6× FLC → FLC). */
export function applyMotorInrushOverlay(
  samples: TimelineSample[],
  circuit: Circuit
): TimelineSample[] {
  const motorIds = new Set(
    circuit.components
      .filter((c) => c.type === 'motor' || c.type === 'three_phase_motor')
      .map((c) => c.id)
  );
  if (motorIds.size === 0) return samples;

  const energizedSince = new Map<string, number>();

  return samples.map((sample) => {
    const nodes = { ...sample.nodes };
    for (const id of motorIds) {
      const n = nodes[id];
      if (!n?.energized) continue;
      if (!energizedSince.has(id)) energizedSince.set(id, sample.timeMs);
      const dt = sample.timeMs - (energizedSince.get(id) ?? sample.timeMs);
      const flc = n.currentA;
      if (flc <= 0) continue;
      const mult = inrushMultiplierAt(dt);
      nodes[id] = {
        ...n,
        currentA: flc * mult,
        powerW: n.powerW * mult,
      };
    }
    return { ...sample, nodes };
  });
}

/**
 * Reduce supply and motor voltage during inrush (I × Z drop on feeder + source impedance).
 */
export function applyVoltageDipOverlay(
  samples: TimelineSample[],
  circuit: Circuit
): TimelineSample[] {
  const feederR = feederResistanceByMotorId(circuit);
  const motorIds = [...feederR.keys()];
  if (motorIds.length === 0) return samples;

  const nominalSingle = defaultSinglePhaseLoadVoltage(circuit);
  const nominalLl = getDefaultThreePhaseLineVoltage(circuit);
  const sourceIds = new Set(
    circuit.components
      .filter((c) => c.type === 'power_source' || c.type === 'three_phase_source')
      .map((c) => c.id)
  );

  const energizedSince = new Map<string, number>();

  return samples.map((sample) => {
    const nodes = cloneScopeNodes(sample.nodes);
    let totalExtraA = 0;

    for (const id of motorIds) {
      const n = nodes[id];
      if (!n?.energized || n.currentA <= 0) continue;
      if (!energizedSince.has(id)) energizedSince.set(id, sample.timeMs);
      const dt = sample.timeMs - (energizedSince.get(id) ?? sample.timeMs);
      const flc = n.currentA / inrushMultiplierAt(dt);
      if (flc <= 0) continue;
      const mult = inrushMultiplierAt(dt);
      const inrushA = flc * mult;
      const extraA = inrushA - flc;
      totalExtraA += extraA;

      const pathZ = feederR.get(id) ?? DEFAULT_ZE_OHMS;
      const motor = circuit.components.find((c) => c.id === id);
      const refV =
        motor?.type === 'three_phase_motor' ? nominalLl : nominalSingle;
      const dipV = Math.min(refV * 0.35, extraA * pathZ);
      nodes[id] = {
        ...n,
        voltageV: Math.max(0, n.voltageV - dipV),
      };
    }

    if (totalExtraA > 0) {
      const sourceDip = Math.min(nominalSingle * 0.2, totalExtraA * DEFAULT_ZE_OHMS);
      for (const sid of sourceIds) {
        const n = nodes[sid];
        if (!n) continue;
        const refV =
          circuit.components.find((c) => c.id === sid)?.type ===
          'three_phase_source'
            ? nominalLl
            : nominalSingle;
        nodes[sid] = {
          ...n,
          voltageV: Math.max(0, (n.voltageV || refV) - sourceDip),
        };
      }
    }

    return { ...sample, nodes };
  });
}

function protectionOutputKeys(c: CircuitComponent): string[] {
  const keys: string[] = [];
  for (const p of c.connectionPoints) {
    const L = labelNorm(p.label);
    if (
      L === '2' ||
      L === 'OUT' ||
      L.startsWith('OUT_') ||
      L === '4' ||
      L === '6' ||
      L === '8'
    ) {
      keys.push(terminalKey(c.id, p.id));
    }
  }
  return keys;
}

function downstreamComponentIds(
  circuit: Circuit,
  deviceId: string
): Set<string> {
  const graph = engine.getTerminalGraphForValidation(structuredClone(circuit));
  const device = circuit.components.find((c) => c.id === deviceId);
  if (!device) return new Set();

  const starts = protectionOutputKeys(device);
  const visited = new Set<string>();
  const componentIds = new Set<string>();
  const queue = [...starts];

  while (queue.length > 0) {
    const k = queue.shift()!;
    if (visited.has(k)) continue;
    visited.add(k);
    const split = splitTerminalKey(k);
    const compId = split?.componentId;
    if (compId && compId !== deviceId) componentIds.add(compId);

    for (const nb of graph.get(k) ?? []) {
      if (!visited.has(nb)) queue.push(nb);
    }
  }
  return componentIds;
}

/** Synthesize fault current until clearing, then de-energize device and downstream. */
export function applyFaultClearingOverlay(
  samples: TimelineSample[],
  circuit: Circuit,
  faultDeviceId: string,
  metrics: ProtectionFaultMetrics
): TimelineSample[] {
  const clearMs = metrics.clearingTimeS * 1000;
  const downstream = downstreamComponentIds(circuit, faultDeviceId);

  return samples.map((sample) => {
    const tripped = sample.timeMs >= clearMs;
    const nodes = cloneScopeNodes(sample.nodes);

    for (const [id, n] of Object.entries(nodes)) {
      if (id === faultDeviceId) {
        if (tripped) {
          nodes[id] = { ...n, voltageV: 0, currentA: 0, powerW: 0, energized: false };
        } else {
          nodes[id] = {
            ...n,
            currentA: metrics.boltedFaultA,
            powerW: metrics.voltageV * metrics.boltedFaultA,
            energized: true,
          };
        }
        continue;
      }
      if (tripped && downstream.has(id)) {
        nodes[id] = { ...n, voltageV: 0, currentA: 0, powerW: 0, energized: false };
      }
    }
    return { ...sample, nodes };
  });
}

function buildFaultClearingTimeline(
  circuit: Circuit,
  faultDeviceId: string,
  opts?: TimelineOptions
): TimelineSample[] {
  const simEngine = new CircuitEngine();
  const baseline = simEngine.simulate(structuredClone(circuit));
  const metrics = getProtectionFaultMetrics(circuit, faultDeviceId, baseline);
  if (!metrics) {
    return buildSimulationTimeline(circuit, { ...opts, scenario: 'normal' });
  }

  const clearMs = metrics.clearingTimeS * 1000;
  const durationMs =
    opts?.durationMs ?? Math.max(FAULT_DURATION_MS, Math.ceil(clearMs + 80));
  const stepMs = opts?.stepMs ?? FAULT_STEP_MS;
  const baseNodes = pickScopeNodes(baseline);
  const samples: TimelineSample[] = [];

  for (let t = 0; t <= durationMs; t += stepMs) {
    samples.push({ timeMs: t, nodes: cloneScopeNodes(baseNodes) });
  }

  return applyFaultClearingOverlay(samples, circuit, faultDeviceId, metrics);
}

/**
 * Sample the engine on a virtual clock so timer delays and contactor pickup
 * evolve over time. Motor inrush and voltage dip are layered on afterward.
 */
export function buildSimulationTimeline(
  circuit: Circuit,
  opts?: TimelineOptions
): TimelineSample[] {
  const scenario = opts?.scenario ?? 'normal';

  if (scenario === 'fault_clearing' && opts?.faultDeviceId) {
    return buildFaultClearingTimeline(circuit, opts.faultDeviceId, opts);
  }

  if (scenario === 'ats_transfer') {
    return buildAtsTransferTimeline(circuit, opts);
  }

  const durationMs = opts?.durationMs ?? DEFAULT_DURATION_MS;
  const stepMs = opts?.stepMs ?? DEFAULT_STEP_MS;
  const startWallMs = opts?.startWallMs ?? Date.now();
  const simEngine = new CircuitEngine();
  const samples: TimelineSample[] = [];

  for (let t = 0; t <= durationMs; t += stepMs) {
    const cloned = structuredClone(circuit);
    const result = simEngine.simulate(cloned, 0, startWallMs + t);
    samples.push({ timeMs: t, nodes: pickScopeNodes(result) });
  }

  const withInrush = applyMotorInrushOverlay(samples, circuit);
  const withDip = applyVoltageDipOverlay(withInrush, circuit);
  return computeMotorThermalTimeline(withDip, circuit);
}

/** Protection device types eligible for fault-clearing scope scenario. */
export function isProtectionDeviceType(type: CircuitComponent['type']): boolean {
  return PROTECTION_DEVICE_TYPES.has(type);
}
