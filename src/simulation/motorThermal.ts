import type { Circuit, CircuitComponent } from '../types';
import { engine } from './engine';
import { terminalKey } from './engineTypes';
import type { TimelineSample } from './transientTimeline';

export type MotorThermalReading = {
  /** Winding / overload-relay thermal model (0–100%). */
  thermalPct: number;
  /** I / I_rated at this instant. */
  currentRatio: number;
  /** Integrated heat reached the trip threshold. */
  tripped: boolean;
  protectorLabel?: string;
  tripClassS?: number;
};

const MOTOR_TYPES = new Set<CircuitComponent['type']>(['motor', 'three_phase_motor']);

const THERMAL_PROTECTORS = new Set<CircuitComponent['type']>([
  'overload_relay',
  'motor_protection_circuit_breaker',
  'mcb',
  'three_phase_mcb',
]);

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

function protectorOutputKeys(c: CircuitComponent): string[] {
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

function bfsDistances(
  graph: Map<string, Set<string>>,
  starts: string[]
): Map<string, number> {
  const dist = new Map<string, number>();
  const queue: string[] = [];
  for (const s of starts) {
    if (!graph.has(s)) continue;
    dist.set(s, 0);
    queue.push(s);
  }
  let i = 0;
  while (i < queue.length) {
    const k = queue[i++];
    const d = dist.get(k) ?? 0;
    for (const nb of graph.get(k) ?? []) {
      if (dist.has(nb)) continue;
      dist.set(nb, d + 1);
      queue.push(nb);
    }
  }
  return dist;
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

/** Closest upstream overload relay / MPCB / MCB feeding this motor. */
export function findMotorThermalProtector(
  circuit: Circuit,
  motorId: string
): CircuitComponent | null {
  const motor = circuit.components.find((c) => c.id === motorId);
  if (!motor) return null;
  const liveKey = motorLiveTerminalKey(motor);
  if (!liveKey) return null;

  const graph = engine.getTerminalGraphForValidation(structuredClone(circuit));
  const dist = bfsDistances(graph, [...collectLiveSeeds(circuit)]);
  const loadDist = dist.get(liveKey);
  if (loadDist === undefined) return null;

  let best: CircuitComponent | null = null;
  let bestOutDist = -1;

  for (const c of circuit.components) {
    if (!THERMAL_PROTECTORS.has(c.type)) continue;
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

export function parseTripClassSeconds(
  raw: string | number | undefined,
  fallback = 10
): number {
  if (raw == null) return fallback;
  const s = String(raw).replace(/A$/i, '').trim();
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** IEC 60947-4-1 class 10/20 inverse-time approximation (seconds to trip at ratio I/Ip). */
export function overloadRelayTripTimeS(
  ratio: number,
  tripClassS: number
): number {
  if (ratio <= 1.05) return Infinity;
  if (ratio >= 5.5) return tripClassS * 2.5;

  const anchors: [number, number][] = [
    [1.05, tripClassS * 120],
    [1.2, tripClassS * 60],
    [1.5, tripClassS * 12],
    [2, tripClassS * 3],
    [3, tripClassS * 1.8],
    [5.5, tripClassS * 2.5],
  ];

  for (let i = 0; i < anchors.length - 1; i++) {
    const [r0, t0] = anchors[i];
    const [r1, t1] = anchors[i + 1];
    if (ratio >= r0 && ratio <= r1) {
      const f = (ratio - r0) / (r1 - r0);
      const logT = Math.log(t0) + f * (Math.log(t1) - Math.log(t0));
      return Math.exp(logT);
    }
  }
  return tripClassS * 2.5;
}

/** MCB thermal band (IEC 60898) — slower trip than magnetic; uses TCC thermal region. */
export function mcbThermalTripTimeS(ratio: number): number {
  if (ratio <= 1.13) return Infinity;
  if (ratio >= 1.45) return 40;
  if (ratio >= 2) return 8;
  if (ratio >= 3) return 2;
  return 120 / (ratio - 1);
}

export function protectorTripClassS(protector: CircuitComponent): number {
  if (protector.type === 'overload_relay') {
    return parseTripClassSeconds(protector.properties.overloadTripClass, 10);
  }
  if (protector.type === 'motor_protection_circuit_breaker') {
    return parseTripClassSeconds(protector.properties.mpcbTripClass, 10);
  }
  return 10;
}

export function protectorPickupAmps(
  protector: CircuitComponent,
  motorFlc: number
): number {
  const p = protector.properties;
  if (protector.type === 'overload_relay') {
    return p.ratingAmps ?? motorFlc;
  }
  if (protector.type === 'motor_protection_circuit_breaker') {
    return (p.ratingAmps ?? motorFlc) * 1.1;
  }
  return p.ratingAmps ?? motorFlc;
}

export function tripTimeAtRatio(
  protector: CircuitComponent,
  ratio: number
): number {
  const tripClassS = protectorTripClassS(protector);
  if (
    protector.type === 'mcb' ||
    protector.type === 'three_phase_mcb'
  ) {
    return mcbThermalTripTimeS(ratio);
  }
  return overloadRelayTripTimeS(ratio, tripClassS);
}

export function motorFullLoadAmps(
  motor: CircuitComponent,
  steadyCurrentA: number
): number {
  const rated = motor.properties.ratedLineAmps;
  if (rated != null && rated > 0) return rated;
  return Math.max(0.1, steadyCurrentA);
}

export function stepThermalHeat(
  heatPct: number,
  currentA: number,
  pickupA: number,
  energized: boolean,
  protector: CircuitComponent | null,
  dtMs: number
): { heatPct: number; tripped: boolean } {
  if (!energized || pickupA <= 0) {
    const coolTau = 45_000;
    return { heatPct: heatPct * Math.exp(-dtMs / coolTau), tripped: false };
  }

  const ratio = currentA / pickupA;
  if (ratio <= 1.02) {
    const coolTau = 90_000;
    return { heatPct: heatPct * Math.exp(-dtMs / coolTau), tripped: false };
  }

  const tripTimeS = protector
    ? tripTimeAtRatio(protector, ratio)
    : overloadRelayTripTimeS(ratio, 10);

  if (!Number.isFinite(tripTimeS)) {
    return { heatPct, tripped: false };
  }

  const heatGain = (100 / tripTimeS) * (dtMs / 1000);
  const next = Math.min(100, heatPct + heatGain);
  return { heatPct: next, tripped: next >= 99.5 };
}

/**
 * Integrate I²t-style heating and cooldown across a timeline that already
 * includes motor inrush overlays.
 */
export function computeMotorThermalTimeline(
  samples: TimelineSample[],
  circuit: Circuit
): TimelineSample[] {
  const motors = circuit.components.filter((c) => MOTOR_TYPES.has(c.type));
  if (motors.length === 0 || samples.length === 0) return samples;

  const heat = new Map<string, number>();
  const flc = new Map<string, number>();
  const protectors = new Map<string, CircuitComponent | null>();

  for (const m of motors) {
    heat.set(m.id, 0);
    const steady = samples[samples.length - 1]?.nodes[m.id]?.currentA ?? 0;
    flc.set(m.id, motorFullLoadAmps(m, steady));
    protectors.set(m.id, findMotorThermalProtector(circuit, m.id));
  }

  return samples.map((sample, idx) => {
    const dtMs =
      idx === 0 ? 0 : sample.timeMs - (samples[idx - 1]?.timeMs ?? 0);
    const motorThermal: Record<string, MotorThermalReading> = {};

    for (const m of motors) {
      const node = sample.nodes[m.id];
      const protector = protectors.get(m.id) ?? null;
      const pickup = protector
        ? protectorPickupAmps(protector, flc.get(m.id) ?? 1)
        : flc.get(m.id) ?? 1;
      const prevHeat = heat.get(m.id) ?? 0;
      const currentA = node?.currentA ?? 0;
      const energized = node?.energized ?? false;

      const stepped =
        dtMs > 0
          ? stepThermalHeat(
              prevHeat,
              currentA,
              pickup,
              energized,
              protector,
              dtMs
            )
          : { heatPct: prevHeat, tripped: false };

      heat.set(m.id, stepped.heatPct);
      motorThermal[m.id] = {
        thermalPct: stepped.heatPct,
        currentRatio: pickup > 0 ? currentA / pickup : 0,
        tripped: stepped.tripped,
        protectorLabel: protector?.label,
        tripClassS: protector ? protectorTripClassS(protector) : 10,
      };
    }

    return { ...sample, motorThermal };
  });
}

export function motorThermalAtSample(
  sample: TimelineSample | undefined,
  motorId: string
): MotorThermalReading | null {
  return sample?.motorThermal?.[motorId] ?? null;
}

function ensureOverloadSim(component: CircuitComponent) {
  if (!component.overloadSimState) component.overloadSimState = {};
  return component.overloadSimState;
}

/**
 * Advance overload-relay bimetal heat for one simulation step.
 * Uses IEC 60947-4-1 Class 10/20/30 inverse-time curve from `overloadTripClass`.
 */
export function advanceOverloadRelayThermal(
  relay: CircuitComponent,
  currentA: number,
  dtMs: number
): { heatPct: number; tripped: boolean } {
  const pickup = relay.properties.ratingAmps ?? 16;
  const sim = ensureOverloadSim(relay);
  const prev = sim.thermalHeatPct ?? 0;
  const stepped =
    dtMs > 0
      ? stepThermalHeat(prev, currentA, pickup, currentA > 0.01, relay, dtMs)
      : { heatPct: prev, tripped: false };
  sim.thermalHeatPct = stepped.heatPct;
  return stepped;
}
