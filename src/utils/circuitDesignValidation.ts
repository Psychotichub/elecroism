import type {
  Circuit,
  CircuitComponent,
  SimulationResult,
  Wire,
} from '../types';
import { engine } from '../simulation/engine';
import { validateBreakingCapacity } from './shortCircuitValidation';
import { validateEarthFaultLoop } from './earthFaultLoopValidation';
import { validateArcFlash } from './arcFlashAnalysis';
import { validatePowerQuality } from './powerQualityValidation';
import { findDuplicateDesignators } from './designatorRules';
import { validateAtsInstallation } from '../simulation/atsTransferSequence';
import { validateCableDerating } from './cableSizingWizard';
import { validateDcFaultLevels } from './dcFaultCurrent';
import {
  classifyDcWirePolarity,
  wireUsesDcColorConvention,
} from './dcWireLabeling';

export type { EarthFaultLoopRow } from './earthFaultLoopValidation';
export { buildEarthFaultLoopReport } from './earthFaultLoopValidation';
export type { ArcFlashRow } from './arcFlashAnalysis';
export {
  buildArcFlashReport,
  downloadArcFlashLabel,
  formatArcFlashLabel,
} from './arcFlashAnalysis';
export type { FaultLevelRow } from './faultLevelAnalysis';
export { buildFaultLevelReport } from './faultLevelAnalysis';
export type { PowerQualityRow } from '../simulation/powerQuality';
export { buildPowerQualityReport } from '../simulation/powerQuality';

export type CircuitValidationSeverity = 'info' | 'warning' | 'error';

export interface CircuitValidationIssue {
  id: string;
  severity: CircuitValidationSeverity;
  message: string;
  /** Primary component(s) to highlight when the user selects the issue. */
  componentIds: string[];
}

/** One row in the protection coordination feeder table (Validation tab). */
export interface ProtectionCoordinationRow {
  componentId: string;
  label: string;
  deviceType: string;
  ratedAmps: number | null;
  tripOrFamily: string | null;
  /** Shortest graph hops from a supply live terminal to a line-side IN terminal */
  minHopsFromLive: number | null;
}

export interface ProtectionCoordinationReport {
  rows: ProtectionCoordinationRow[];
  issues: CircuitValidationIssue[];
}

const SOURCE_TYPES = new Set([
  'power_source',
  'three_phase_source',
  'dc_power_source',
  'ac_dc_converter',
  'smps',
]);

const LOAD_TYPES_FOR_SOURCE_CHECK = new Set([
  'lamp',
  'motor',
  'heater',
  'panel_heater',
  'cooling_fan',
  'generic_load',
  'socket',
  'three_phase_motor',
  'indicator_lamp',
]);

const IP_COMM_TYPES = new Set([
  'modbus_tcp_gateway',
  'bacnet_ip_gateway',
  'communication_converter',
  'iot_gateway',
  'cloud_monitoring_module',
  'energy_management_controller',
  'ethernet_switch',
  'relay_interface_card',
]);

const BREAKER_TYPES_FOR_CABLE = new Set([
  'mcb',
  'three_phase_mcb',
  'mccb',
  'motor_protection_circuit_breaker',
  'four_phase_mcb',
  'motorized_mccb',
  'four_pole_motorized_mccb',
  'hrc_fuse',
  'control_circuit_fuse',
]);

/** Breakers / fuses / RCDs for feeder-order coordination (not ELR/CBCT — different role). */
const PROTECTION_COORDINATION_TYPES = new Set([
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

function tKey(componentId: string, pointId: string): string {
  return `${componentId}:${pointId}`;
}

function bfsFrom(
  graph: Map<string, Set<string>>,
  starts: string[]
): Set<string> {
  const seen = new Set<string>();
  const queue = [...starts];
  for (const s of starts) {
    if (graph.has(s)) seen.add(s);
  }
  let i = 0;
  while (i < queue.length) {
    const k = queue[i++];
    for (const n of graph.get(k) ?? []) {
      if (!seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  return seen;
}

function intersects(a: Set<string>, b: Set<string>): boolean {
  for (const x of a) {
    if (b.has(x)) return true;
  }
  return false;
}

function labelNorm(l: string): string {
  return l.trim().toUpperCase();
}

function isPeLikeLabel(label: string): boolean {
  const u = labelNorm(label);
  if (u === 'PE' || u === 'SHIELD_FG' || u === 'FG') return true;
  if (u.startsWith('PE_')) return true;
  if (u === 'PWR_PE') return true;
  return false;
}

function isNeutralConductorLabel(label: string): boolean {
  const u = labelNorm(label);
  if (u === 'N' || u === 'N_OUT' || u === 'N_IN') return true;
  if (u === 'AC_N' || u === 'PRI_N' || u === 'SEC_N' || u === 'PWR_N')
    return true;
  if (u.endsWith('_N')) {
    if (u.includes('PE')) return false;
    return true;
  }
  return false;
}

function wireCountAt(
  wires: Wire[],
  componentId: string,
  pointId: string
): number {
  let n = 0;
  for (const w of wires) {
    if (w.fromComponentId === componentId && w.fromPointId === pointId) n++;
    if (w.toComponentId === componentId && w.toPointId === pointId) n++;
  }
  return n;
}

/**
 * Imbalance % = (max − min) / mean × 100 for per-phase watts (if any set) or
 * for current magnitude factors (otherwise).
 */
function threePhaseMotorImbalancePercent(c: CircuitComponent): number {
  const p = c.properties;
  const w1 = p.powerWattsL1,
    w2 = p.powerWattsL2,
    w3 = p.powerWattsL3;
  const hasW =
    w1 !== undefined || w2 !== undefined || w3 !== undefined;
  const p1 = Math.max(0, w1 ?? 0);
  const p2 = Math.max(0, w2 ?? 0);
  const p3 = Math.max(0, w3 ?? 0);
  if (hasW && p1 + p2 + p3 > 0) {
    const mean = (p1 + p2 + p3) / 3;
    if (mean <= 0) return 0;
    return (100 * (Math.max(p1, p2, p3) - Math.min(p1, p2, p3))) / mean;
  }
  const f1 = p.threePhaseCurrentFactorL1 ?? 1;
  const f2 = p.threePhaseCurrentFactorL2 ?? 1;
  const f3 = p.threePhaseCurrentFactorL3 ?? 1;
  const meanF = (f1 + f2 + f3) / 3;
  if (meanF <= 0) return 0;
  return (100 * (Math.max(f1, f2, f3) - Math.min(f1, f2, f3))) / meanF;
}

/** Typical continuous Cu capacity hints (A), rounded; not a substitute for standards tables. */
function maxContinuousAmpsCu(crossSectionMm2: number): number {
  const table: Record<number, number> = {
    0.5: 4,
    0.75: 7,
    1: 10,
    1.5: 14,
    2.5: 20,
    4: 28,
    6: 38,
    10: 55,
    16: 70,
    25: 95,
    35: 115,
    50: 145,
    70: 180,
    95: 220,
    120: 260,
    150: 300,
    185: 345,
    240: 400,
  };
  const key = Math.round(crossSectionMm2 * 1000) / 1000;
  if (table[key] !== undefined) return table[key];
  if (crossSectionMm2 < 0.5) return 3;
  if (crossSectionMm2 > 240) return Math.round(400 + (crossSectionMm2 - 240) * 0.9);
  // Linear interpolate between bracketing standard sizes
  const sizes = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  for (let i = 0; i < sizes.length - 1; i++) {
    const a = sizes[i];
    const b = sizes[i + 1];
    if (crossSectionMm2 > a && crossSectionMm2 < b) {
      const t = (crossSectionMm2 - a) / (b - a);
      return Math.round(table[a] + t * (table[b] - table[a]));
    }
  }
  return Math.round(Math.min(450, crossSectionMm2 * 1.65));
}

export function collectSupplySeeds(circuit: Circuit): {
  live: Set<string>;
  neutral: Set<string>;
} {
  const live = new Set<string>();
  const neutral = new Set<string>();
  for (const c of circuit.components) {
    for (const p of c.connectionPoints) {
      const k = tKey(c.id, p.id);
      const L = labelNorm(p.label);
      if (c.type === 'power_source') {
        if (L === 'L_OUT') live.add(k);
        if (L === 'N_OUT') neutral.add(k);
      } else if (c.type === 'three_phase_source') {
        if (L === 'L1_OUT' || L === 'L2_OUT' || L === 'L3_OUT') live.add(k);
        if (L === 'N_OUT') neutral.add(k);
      } else if (c.type === 'dc_power_source' || c.type === 'dc_battery_backup') {
        if (L.includes('PLUS') || L.includes('POS')) live.add(k);
        if (L.includes('MINUS') || L.includes('NEG')) neutral.add(k);
      } else if (c.type === 'smps' || c.type === 'ac_dc_converter') {
        if (L.includes('PLUS')) live.add(k);
        if (L.includes('MINUS')) neutral.add(k);
      }
    }
  }
  return { live, neutral };
}

function isBreakerOutLabel(label: string): boolean {
  const u = labelNorm(label);
  if (u === 'OUT') return true;
  return u.startsWith('OUT_');
}

function breakerRatedAmps(c: CircuitComponent): number | null {
  if (c.type === 'hrc_fuse') {
    const amps = c.properties.ratingAmps;
    return typeof amps === 'number' && amps > 0 ? amps : null;
  }
  const amps = c.properties.ratingAmps;
  if (typeof amps === 'number' && amps > 0) return amps;
  return null;
}

function bfsShortestDistances(
  graph: Map<string, Set<string>>,
  starts: string[]
): Map<string, number> {
  const dist = new Map<string, number>();
  const q: string[] = [];
  for (const s of starts) {
    if (graph.has(s) && !dist.has(s)) {
      dist.set(s, 0);
      q.push(s);
    }
  }
  let i = 0;
  while (i < q.length) {
    const k = q[i++];
    const d = dist.get(k)!;
    for (const n of graph.get(k) ?? []) {
      if (!dist.has(n)) {
        dist.set(n, d + 1);
        q.push(n);
      }
    }
  }
  return dist;
}

/** Terminals treated as line-side inputs for hop distance from supply live. */
function breakerLiveInputKeys(c: CircuitComponent): string[] {
  const keys: string[] = [];
  for (const p of c.connectionPoints) {
    const L = labelNorm(p.label);
    if (L === 'IN' || L === 'IN_L' || L.startsWith('IN_L')) {
      keys.push(tKey(c.id, p.id));
    }
  }
  if (keys.length > 0) return keys;
  for (const p of c.connectionPoints) {
    const L = labelNorm(p.label);
    if (L.startsWith('IN_')) {
      keys.push(tKey(c.id, p.id));
    }
  }
  return keys;
}

function protectiveRatedAmpsCoord(c: CircuitComponent): number | null {
  return breakerRatedAmps(c);
}

function coordinationTripLabel(c: CircuitComponent): string | null {
  const p = c.properties;
  if (c.type === 'mcb') return p.tripCurve ?? null;
  if (c.type === 'three_phase_mcb' || c.type === 'four_phase_mcb') {
    return p.tripCurve ?? null;
  }
  if (c.type === 'hrc_fuse') return p.hrcType ?? null;
  if (c.type === 'rcd' || c.type === 'residual_current_circuit_breaker') {
    return p.rcdType ?? null;
  }
  if (c.type === 'air_circuit_breaker') {
    const inst = p.acbInstantaneousMult;
    return typeof inst === 'number' ? `Ir×${inst} inst` : null;
  }
  return null;
}

/**
 * Upstream/downstream ordering from graph hop count from supply live terminals,
 * plus coordination warnings (downstream In higher than upstream, unreachable
 * devices). Cable vs breaker sizing stays in the main validation list.
 */
export function buildProtectionCoordinationReportInner(
  circuit: Circuit,
  graph: Map<string, Set<string>>,
  liveSeedKeys: Set<string>
): ProtectionCoordinationReport {
  const issues: CircuitValidationIssue[] = [];
  const rows: ProtectionCoordinationRow[] = [];

  if (liveSeedKeys.size === 0 || graph.size === 0) {
    return { rows: [], issues: [] };
  }

  const dist = bfsShortestDistances(graph, [...liveSeedKeys]);

  for (const c of circuit.components) {
    if (!PROTECTION_COORDINATION_TYPES.has(c.type)) continue;
    const rating = protectiveRatedAmpsCoord(c);
    const inKeys = breakerLiveInputKeys(c);
    let minH: number | null = null;
    for (const k of inKeys) {
      const d = dist.get(k);
      if (d !== undefined && (minH === null || d < minH)) minH = d;
    }
    if (minH === null && inKeys.length > 0) {
      issues.push({
        id: `coord-unreach-${c.id}`,
        severity: 'info',
        message: `Protection coordination: "${c.label}" line-side input does not reach a modeled supply live terminal (device open, wrong topology, or isolated).`,
        componentIds: [c.id],
      });
    }
    rows.push({
      componentId: c.id,
      label: c.label,
      deviceType: c.type,
      ratedAmps: rating,
      tripOrFamily: coordinationTripLabel(c),
      minHopsFromLive: minH,
    });
  }

  rows.sort((a, b) => {
    const ad = a.minHopsFromLive ?? 1_000_000;
    const bd = b.minHopsFromLive ?? 1_000_000;
    if (ad !== bd) return ad - bd;
    return a.label.localeCompare(b.label);
  });

  for (let i = 0; i < rows.length - 1; i++) {
    const up = rows[i];
    const down = rows[i + 1];
    const a = up.ratedAmps;
    const b = down.ratedAmps;
    if (
      a !== null &&
      b !== null &&
      b > a &&
      up.minHopsFromLive !== null &&
      down.minHopsFromLive !== null &&
      down.minHopsFromLive > up.minHopsFromLive
    ) {
      issues.push({
        id: `coord-disc-${up.componentId}-${down.componentId}`,
        severity: 'warning',
        message: `Protection coordination: "${down.label}" (${b} A) appears downstream of "${up.label}" (${a} A) but has a higher rating — selective grading / backup rules may be violated.`,
        componentIds: [up.componentId, down.componentId],
      });
    }
  }

  return { rows, issues };
}

export function buildProtectionCoordinationReport(
  circuit: Circuit
): ProtectionCoordinationReport {
  const clone = structuredClone(circuit);
  const graph = engine.getTerminalGraphForValidation(clone);
  const { live } = collectSupplySeeds(circuit);
  return buildProtectionCoordinationReportInner(circuit, graph, live);
}

/**
 * Design-time checks shown before / alongside simulation. Uses a clone of the
 * circuit so contactor pickup resolution does not mutate the store.
 */
export function runCircuitDesignValidation(
  circuit: Circuit,
  simulationResult: SimulationResult | null
): CircuitValidationIssue[] {
  const issues: CircuitValidationIssue[] = [];
  const push = (issue: CircuitValidationIssue) => issues.push(issue);

  const clone = structuredClone(circuit);
  const graph = engine.getTerminalGraphForValidation(clone);
  const { live: liveSeeds, neutral: neutralSeeds } = collectSupplySeeds(circuit);
  const skipPolarityPathChecks =
    liveSeeds.size === 0 || neutralSeeds.size === 0;

  for (const iss of buildProtectionCoordinationReportInner(
    circuit,
    graph,
    liveSeeds
  ).issues) {
    push(iss);
  }

  const hasSource = circuit.components.some((c) => SOURCE_TYPES.has(c.type));
  const hasLoads = circuit.components.some((c) =>
    LOAD_TYPES_FOR_SOURCE_CHECK.has(c.type)
  );
  if (hasLoads && !hasSource) {
    push({
      id: 'source-missing',
      severity: 'warning',
      message:
        'No supply symbol (AC source, 3φ supply, DC supply, SMPS, or AC/DC converter) is on the drawing. Loads cannot be fed realistically.',
      componentIds: [],
    });
  }

  const liveReach = skipPolarityPathChecks
    ? new Set<string>()
    : bfsFrom(graph, [...liveSeeds]);
  const neutralReach = skipPolarityPathChecks
    ? new Set<string>()
    : bfsFrom(graph, [...neutralSeeds]);

  for (const c of circuit.components) {
    if (
      c.type === 'lamp' ||
      c.type === 'heater' ||
      c.type === 'motor' ||
      c.type === 'generic_load' ||
      c.type === 'panel_heater' ||
      c.type === 'cooling_fan'
    ) {
      const t1 = c.connectionPoints.find((p) => labelNorm(p.label) === 'T1');
      const t2 = c.connectionPoints.find((p) => labelNorm(p.label) === 'T2');
      if (!t1 || !t2) continue;
      const w1 = wireCountAt(circuit.wires, c.id, t1.id);
      const w2 = wireCountAt(circuit.wires, c.id, t2.id);
      if (w1 === 0 || w2 === 0) {
        push({
          id: `load-unwired-${c.id}`,
          severity: 'warning',
          message: `"${c.label}" (${c.type.replace(/_/g, ' ')}): a load terminal has no wire — there is no complete supply/return path.`,
          componentIds: [c.id],
        });
        continue;
      }
      if (!skipPolarityPathChecks) {
        const k1 = tKey(c.id, t1.id);
        const k2 = tKey(c.id, t2.id);
        const r1 = bfsFrom(graph, [k1]);
        const r2 = bfsFrom(graph, [k2]);
        const lineOk = intersects(r1, liveReach);
        const retOk = intersects(r2, neutralReach);
        if (!lineOk || !retOk) {
          push({
            id: `load-return-${c.id}`,
            severity: 'warning',
            message: `"${c.label}": T1 should reach a live conductor and T2 a neutral/return (check polarity, series devices, and contactor pickup).`,
            componentIds: [c.id],
          });
        }
      }
    }

    if (c.type === 'socket') {
      const Lp = c.connectionPoints.find((p) => labelNorm(p.label) === 'L');
      const Np = c.connectionPoints.find((p) => labelNorm(p.label) === 'N');
      if (!Lp || !Np) continue;
      if (
        wireCountAt(circuit.wires, c.id, Lp.id) === 0 ||
        wireCountAt(circuit.wires, c.id, Np.id) === 0
      ) {
        push({
          id: `socket-unwired-${c.id}`,
          severity: 'warning',
          message: `"${c.label}" (socket): L or N is unwired — no safe supply path.`,
          componentIds: [c.id],
        });
        continue;
      }
      if (!skipPolarityPathChecks) {
        const rL = bfsFrom(graph, [tKey(c.id, Lp.id)]);
        const rN = bfsFrom(graph, [tKey(c.id, Np.id)]);
        if (!intersects(rL, liveReach) || !intersects(rN, neutralReach)) {
          push({
            id: `socket-return-${c.id}`,
            severity: 'warning',
            message: `"${c.label}" (socket): L and N do not both reach live and neutral networks from the model supplies.`,
            componentIds: [c.id],
          });
        }
      }
    }

    if (c.type === 'indicator_lamp') {
      const Lp = c.connectionPoints.find((p) => labelNorm(p.label) === 'L');
      const Np = c.connectionPoints.find((p) => labelNorm(p.label) === 'N');
      if (!Lp || !Np) continue;
      if (
        wireCountAt(circuit.wires, c.id, Lp.id) === 0 ||
        wireCountAt(circuit.wires, c.id, Np.id) === 0
      ) {
        push({
          id: `ind-lamp-unwired-${c.id}`,
          severity: 'info',
          message: `"${c.label}" (indicator): L or N is unwired.`,
          componentIds: [c.id],
        });
      }
    }

    if (c.type === 'three_phase_motor') {
      for (const tag of ['L1', 'L2', 'L3'] as const) {
        const p = c.connectionPoints.find((x) => labelNorm(x.label) === tag);
        if (p && wireCountAt(circuit.wires, c.id, p.id) === 0) {
          push({
            id: `motor-phase-${c.id}-${tag}`,
            severity: 'warning',
            message: `"${c.label}" (3φ motor): phase terminal ${tag} has no wire.`,
            componentIds: [c.id],
          });
        }
      }
      const nPt = c.connectionPoints.find((x) => labelNorm(x.label) === 'N');
      if (nPt) {
        if (wireCountAt(circuit.wires, c.id, nPt.id) === 0) {
          push({
            id: `motor-n-unwired-${c.id}`,
            severity: 'warning',
            message: `"${c.label}" (3φ motor): neutral (N) is not connected — many installations require N for control/imbalance.`,
            componentIds: [c.id],
          });
        } else if (!skipPolarityPathChecks) {
          const rN = bfsFrom(graph, [tKey(c.id, nPt.id)]);
          if (!intersects(rN, neutralReach)) {
            push({
              id: `motor-n-path-${c.id}`,
              severity: 'warning',
              message: `"${c.label}" (3φ motor): N is wired but does not reach a supply neutral in the current topology.`,
              componentIds: [c.id],
            });
          }
        }
      }
    }
  }

  const compById = new Map(circuit.components.map((c) => [c.id, c]));
  for (const w of circuit.wires) {
    const fc = compById.get(w.fromComponentId);
    const tc = compById.get(w.toComponentId);
    const fp = fc?.connectionPoints.find((p) => p.id === w.fromPointId);
    const tp = tc?.connectionPoints.find((p) => p.id === w.toPointId);
    if (!fp || !tp) continue;
    const a = fp.label;
    const b = tp.label;
    if (
      (isPeLikeLabel(a) && isNeutralConductorLabel(b)) ||
      (isPeLikeLabel(b) && isNeutralConductorLabel(a))
    ) {
      push({
        id: `pe-neutral-wire-${w.id}`,
        severity: 'error',
        message: `Wire "${w.id.slice(0, 8)}…" joins PE (or shield) to a neutral conductor. PE must not be used as a neutral; bond only where rules allow (e.g. service PEN).`,
        componentIds: [w.fromComponentId, w.toComponentId],
      });
    }
  }

  for (const c of circuit.components) {
    if (c.type === 'air_circuit_breaker') {
      const p = c.properties;
      const hasCmd =
        !!(p.acbBmsDoCloseTag?.trim() || p.acbBmsDoOpenTag?.trim());
      if (p.acbBmsEnabled && hasCmd && p.acbBmsUvrEnergized === false) {
        push({
          id: `acb-bms-supply-${c.id}`,
          severity: 'warning',
          message: `"${c.label}" (ACB): BMS open/close tags are set but the UVR / control permissive is off — commands will not close mains in the model.`,
          componentIds: [c.id],
        });
      }
    }
    if (c.type === 'motorized_mccb' || c.type === 'four_pole_motorized_mccb') {
      const p = c.properties;
      const hasCmd =
        !!(p.mccbBmsDoMotorTag?.trim() || p.mccbBmsDoShuntTag?.trim());
      if (p.mccbBmsEnabled && hasCmd && p.mccbBmsCtrlVoltageOk === false) {
        push({
          id: `mccb-bms-supply-${c.id}`,
          severity: 'warning',
          message: `"${c.label}" (motorized MCCB): BMS motor/shunt tags are set but control supply OK is false — remote operation is blocked.`,
          componentIds: [c.id],
        });
      }
    }
  }

  for (const c of circuit.components) {
    if (IP_COMM_TYPES.has(c.type)) {
      const ip = c.properties.gatewayIp?.trim();
      if (!ip) {
        push({
          id: `comm-ip-${c.id}`,
          severity: 'warning',
          message: `"${c.label}" (${c.type.replace(/_/g, ' ')}): set an IP / hostname for the Ethernet interface.`,
          componentIds: [c.id],
        });
      }
    }
    if (c.type === 'energy_meter' || c.type === 'digital_multifunction_meter') {
      const proto = c.properties.meterProtocol ?? 'none';
      if (proto !== 'none') {
        const addr = c.properties.meterCommAddress;
        if (addr === undefined || addr === null || addr < 1) {
          push({
            id: `meter-addr-${c.id}`,
            severity: 'warning',
            message: `"${c.label}" (${c.type.replace(/_/g, ' ')}): ${proto.replace(/_/g, ' ')} is selected — set a valid Modbus/BACnet device address.`,
            componentIds: [c.id],
          });
        }
      }
    }
    if (c.type === 'bacnet_ip_gateway') {
      const inst = c.properties.bacnetDeviceInstance;
      if (inst === undefined || inst === null || inst < 0) {
        push({
          id: `bacnet-inst-${c.id}`,
          severity: 'info',
          message: `"${c.label}" (BACnet/IP gateway): BACnet device instance should be set for unique network identity.`,
          componentIds: [c.id],
        });
      }
    }
  }

  for (const c of circuit.components) {
    if (!BREAKER_TYPES_FOR_CABLE.has(c.type)) continue;
    const rating = breakerRatedAmps(c);
    if (rating === null) continue;
    for (const p of c.connectionPoints) {
      if (!isBreakerOutLabel(p.label)) continue;
      for (const w of circuit.wires) {
        const fromHere =
          w.fromComponentId === c.id && w.fromPointId === p.id;
        const toHere = w.toComponentId === c.id && w.toPointId === p.id;
        if (!fromHere && !toHere) continue;
        const cap = maxContinuousAmpsCu(w.crossSection);
        if (rating > cap) {
          push({
            id: `breaker-cable-${c.id}-${p.id}-${w.id}`,
            severity: 'warning',
            message: `"${c.label}" ${p.label} → wire: breaker/fuse rating (${rating} A) is higher than a typical continuous capacity for ${w.crossSection} mm² Cu (${cap} A class). Size the cable to the protective device.`,
            componentIds: [c.id],
          });
        }
      }
    }
  }

  if (simulationResult) {
    for (const w of circuit.wires) {
      const cap = maxContinuousAmpsCu(w.crossSection);
      const i = Math.abs(w.currentAmps ?? 0);
      if (i > cap * 0.95 && i > 0.5) {
        push({
          id: `wire-thermal-${w.id}`,
          severity: 'warning',
          message: `Wire ${w.crossSection} mm² carries ~${i.toFixed(2)} A in the last solve — may be undersized vs typical Cu capacity (~${cap} A continuous).`,
          componentIds: [],
        });
      }
      const dropV = w.voltageDropV ?? 0;
      if (dropV > 4 && i > 0.5) {
        push({
          id: `wire-vdrop-${w.id}`,
          severity: 'warning',
          message: `Wire ${w.wireNumber ?? w.id.slice(0, 6)} (${w.crossSection} mm²): ~${dropV.toFixed(2)} V conductor drop in load-flow — consider larger cable or shorter run.`,
          componentIds: [],
        });
      }
    }
    const maxDrop = simulationResult.loadFlowMaxVoltageDropPct;
    if (maxDrop != null && maxDrop > 5) {
      push({
        id: 'loadflow-max-vdrop',
        severity: 'warning',
        message: `Impedance load flow: worst load sees ~${maxDrop.toFixed(1)}% voltage drop vs nominal — check cable sizes and run lengths.`,
        componentIds: [],
      });
    }
  }

  const imbThresh = circuit.phaseImbalanceWarningPercent ?? 15;
  for (const c of circuit.components) {
    if (c.type !== 'three_phase_motor' && c.type !== 'motor') continue;
    const ps = c.properties.phaseSystem ?? 'single_phase';
    if (c.type === 'three_phase_motor' && ps === 'single_phase') continue;
    if (c.type === 'motor' && ps !== 'three_phase') continue;
    const imb = threePhaseMotorImbalancePercent(c);
    if (imb > imbThresh + 1e-6) {
      push({
        id: `phase-imbalance-${c.id}`,
        severity: 'warning',
        message: `"${c.label}" (${c.type.replace(/_/g, ' ')}): phase load imbalance ≈${imb.toFixed(0)}% (max−min over mean of per-phase watts or current factors) exceeds the board warning threshold (${imbThresh}%).`,
        componentIds: [c.id],
      });
    }
  }

  for (const iss of validateBreakingCapacity(circuit, simulationResult)) {
    push(iss);
  }

  for (const iss of validateEarthFaultLoop(circuit, simulationResult)) {
    push(iss);
  }

  for (const iss of validateArcFlash(circuit, simulationResult)) {
    push(iss);
  }

  for (const iss of validatePowerQuality(circuit, simulationResult)) {
    push(iss);
  }

  for (const iss of validateAtsInstallation(circuit)) {
    push(iss);
  }

  for (const iss of validateCableDerating(circuit)) {
    push({
      id: iss.id,
      severity: iss.severity,
      message: iss.message,
      componentIds: [],
    });
  }

  for (const iss of validateDcFaultLevels(circuit, graph)) {
    push({
      id: iss.id,
      severity: iss.severity,
      message: iss.message,
      componentIds: iss.componentIds,
    });
  }

  for (const w of circuit.wires) {
    const fromC = circuit.components.find((c) => c.id === w.fromComponentId);
    const toC = circuit.components.find((c) => c.id === w.toComponentId);
    const fromL =
      fromC?.connectionPoints.find((p) => p.id === w.fromPointId)?.label ?? '';
    const toL =
      toC?.connectionPoints.find((p) => p.id === w.toPointId)?.label ?? '';
    if (classifyDcWirePolarity(fromL, toL) === 'not_dc') continue;
    if (wireUsesDcColorConvention(w, fromL, toL)) continue;
    push({
      id: `dc-wire-color-${w.id}`,
      severity: 'info',
      message: `DC wire ${w.wireLabel || w.wireNumber || w.id.slice(0, 8)}: colour "${w.color}" does not match typical DC convention (red +, black/blue −) for ${fromL}↔${toL}.`,
      componentIds: [],
    });
  }

  for (const dup of findDuplicateDesignators(circuit)) {
    push({
      id: `designator-dup-${dup.normalized}`,
      severity: 'error',
      message: `Duplicate device tag "${dup.display}" on ${dup.componentIds.length} symbols — renumber or rename so each device is unique.`,
      componentIds: dup.componentIds,
    });
  }

  issues.sort((a, b) => {
    const rank = (s: CircuitValidationSeverity) =>
      s === 'error' ? 0 : s === 'warning' ? 1 : 2;
    const d = rank(a.severity) - rank(b.severity);
    if (d !== 0) return d;
    return a.message.localeCompare(b.message);
  });

  return issues;
}
