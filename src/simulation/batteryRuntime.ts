/**
 * UPS / battery backup energy model: SoC depletion on inverter, charging on mains restore.
 */

import type {
  Circuit,
  CircuitComponent,
  FaultEvent,
  NodeResult,
} from '../types';
import { isLoadComponent } from './componentClassification';
import { bfsFrom, linePotentialAt, terminalKey, tokenizeLabel } from './engineTypes';
import type { PotentialSets } from './engineTypes';

export const DEFAULT_BATTERY_CUTOFF_PERCENT = 15;
export const DEFAULT_UPS_CHARGE_CURRENT_A = 2;
/** Cap elapsed time per simulation step (avoids huge jumps after idle). */
export const MAX_BATTERY_STEP_MS = 120_000;

function findCp(component: CircuitComponent, label: string) {
  return component.connectionPoints.find(
    (cp) => cp.label.toUpperCase() === label.toUpperCase()
  );
}

export function batteryCapacityAh(bat: CircuitComponent): number {
  return Math.max(0.1, bat.properties.batteryCapacityAh ?? 7);
}

export function batteryCutoffFraction(bat: CircuitComponent): number {
  const pct = bat.properties.batteryCutoffPercent ?? DEFAULT_BATTERY_CUTOFF_PERCENT;
  return Math.min(0.5, Math.max(0.05, pct / 100));
}

export function readBatteryRemainingAh(bat: CircuitComponent): number {
  const cap = batteryCapacityAh(bat);
  const raw = bat.properties.batteryRemainingAh;
  if (raw != null && Number.isFinite(raw)) {
    return Math.min(cap, Math.max(0, raw));
  }
  return cap;
}

export function writeBatteryRemainingAh(bat: CircuitComponent, ah: number): void {
  const cap = batteryCapacityAh(bat);
  bat.properties.batteryRemainingAh = Math.min(cap, Math.max(0, ah));
}

export function batteryStateOfCharge(bat: CircuitComponent): number {
  const cap = batteryCapacityAh(bat);
  return cap > 0 ? readBatteryRemainingAh(bat) / cap : 0;
}

/** Linear voltage sag vs state of charge above cutoff. */
export function effectiveBatteryVoltage(bat: CircuitComponent): number {
  const vNom = bat.properties.voltage ?? 24;
  const soc = batteryStateOfCharge(bat);
  const cutoff = batteryCutoffFraction(bat);
  if (soc <= cutoff) return 0;
  const span = 1 - cutoff;
  const frac = span > 0 ? (soc - cutoff) / span : 1;
  return vNom * (0.85 + 0.15 * frac);
}

export function batteryCanSupply(bat: CircuitComponent): boolean {
  if (bat.state === 'off' || bat.state === 'tripped') return false;
  return readBatteryRemainingAh(bat) > batteryCapacityAh(bat) * batteryCutoffFraction(bat);
}

/**
 * True when an upstream AC supply (not inverter back-feed) reaches the UPS input.
 */
export function upsExternalMainsPresent(
  ups: CircuitComponent,
  circuit: Circuit,
  graph: Map<string, Set<string>>,
  potentials: PotentialSets
): boolean {
  const acInL = findCp(ups, 'AC_IN_L');
  const acInN = findCp(ups, 'AC_IN_N');
  if (!acInL || !acInN) return false;
  const acInLk = terminalKey(ups.id, acInL.id);
  const acInNk = terminalKey(ups.id, acInN.id);
  if (!potentials.neutral.has(acInNk)) return false;

  for (const src of circuit.components) {
    if (src.type !== 'power_source' && src.type !== 'three_phase_source') continue;
    if (src.state === 'off' || src.state === 'tripped') continue;
    for (const cp of src.connectionPoints) {
      const key = terminalKey(src.id, cp.id);
      if (!linePotentialAt(potentials, key)) continue;
      const tokens = tokenizeLabel(cp.label);
      const isLine =
        tokens.includes('L') ||
        tokens.includes('LINE') ||
        tokens.includes('L1') ||
        tokens.includes('PHASE');
      if (!isLine) continue;
      if (bfsFrom(graph, [key]).has(acInLk)) return true;
    }
  }
  return false;
}

/** Battery string wired to UPS BAT+/BAT− terminals. */
export function findBatteryForUps(
  ups: CircuitComponent,
  circuit: Circuit,
  graph: Map<string, Set<string>>
): CircuitComponent | null {
  const batPos = findCp(ups, 'BAT_POS');
  const batNeg = findCp(ups, 'BAT_NEG');
  if (!batPos || !batNeg) return null;
  const posReach = bfsFrom(graph, [terminalKey(ups.id, batPos.id)]);
  const negReach = bfsFrom(graph, [terminalKey(ups.id, batNeg.id)]);

  for (const c of circuit.components) {
    if (c.type !== 'dc_battery_backup') continue;
    let onPlus = false;
    let onMinus = false;
    for (const cp of c.connectionPoints) {
      const key = terminalKey(c.id, cp.id);
      const u = cp.label.toUpperCase();
      if (posReach.has(key) && (u.includes('POS') || u.includes('PLUS'))) onPlus = true;
      if (negReach.has(key) && (u.includes('NEG') || u.includes('MINUS'))) onMinus = true;
    }
    if (onPlus && onMinus) return c;
  }
  return null;
}

function loadOnReachableBus(
  c: CircuitComponent,
  plusReach: Set<string>,
  minusReach: Set<string>
): boolean {
  let onPlus = false;
  let onMinus = false;
  for (const cp of c.connectionPoints) {
    const key = terminalKey(c.id, cp.id);
    if (plusReach.has(key)) onPlus = true;
    if (minusReach.has(key)) onMinus = true;
  }
  return onPlus && onMinus;
}

/** Sum AC load power on UPS output when inverter feeds the bus. */
export function sumUpsOutputLoadPowerW(
  ups: CircuitComponent,
  circuit: Circuit,
  graph: Map<string, Set<string>>,
  nodes: Record<string, NodeResult>
): number {
  const acOutL = findCp(ups, 'AC_OUT_L');
  const acOutN = findCp(ups, 'AC_OUT_N');
  if (!acOutL || !acOutN) return 0;

  const plusReach = bfsFrom(graph, [terminalKey(ups.id, acOutL.id)]);
  const minusReach = bfsFrom(graph, [terminalKey(ups.id, acOutN.id)]);

  let total = 0;
  for (const c of circuit.components) {
    if (c.id === ups.id || !isLoadComponent(c)) continue;
    const node = nodes[c.id];
    if (!node?.energized) continue;
    if (!loadOnReachableBus(c, plusReach, minusReach)) continue;
    total += node.powerW ?? c.properties.powerWatts ?? 0;
  }
  return total;
}

export function upsChargeCurrentA(ups: CircuitComponent): number {
  const a = ups.properties.upsChargeCurrentA;
  if (a != null && a > 0) return a;
  return DEFAULT_UPS_CHARGE_CURRENT_A;
}

export type BatteryRuntimeSummary = {
  faults: FaultEvent[];
  anyTripped: boolean;
};

/**
 * Update battery SoC from inverter discharge / mains charging; trip UPS on under-voltage.
 */
export function applyBatteryRuntime(
  circuit: Circuit,
  nodes: Record<string, NodeResult>,
  potentials: PotentialSets,
  graph: Map<string, Set<string>>,
  dtMs: number,
  wallMs: number
): BatteryRuntimeSummary {
  const faults: FaultEvent[] = [];
  let anyTripped = false;
  const dtHours = dtMs > 0 ? dtMs / 3_600_000 : 0;

  for (const bat of circuit.components) {
    if (bat.type !== 'dc_battery_backup') continue;
    writeBatteryRemainingAh(bat, readBatteryRemainingAh(bat));
    const node = nodes[bat.id];
    if (!node) continue;
    const soc = batteryStateOfCharge(bat);
    nodes[bat.id] = {
      ...node,
      voltageV: effectiveBatteryVoltage(bat),
      energized: batteryCanSupply(bat),
      batteryRemainingAh: readBatteryRemainingAh(bat),
      batteryStateOfChargePct: soc * 100,
    };
  }

  if (dtHours <= 0) {
    return { faults, anyTripped };
  }

  for (const ups of circuit.components) {
    if (ups.type !== 'ups_module') continue;
    if (ups.state === 'off' || ups.state === 'tripped') continue;

    const bat = findBatteryForUps(ups, circuit, graph);
    if (!bat) continue;

    const mains = upsExternalMainsPresent(ups, circuit, graph, potentials);
    const inverterOn = ups.properties.upsInverterEnabled !== false;
    const vBat = effectiveBatteryVoltage(bat);
    const upsNode = nodes[ups.id];

    if (!mains && inverterOn && batteryCanSupply(bat)) {
      const pOut = sumUpsOutputLoadPowerW(ups, circuit, graph, nodes);
      const iDc = vBat > 1 ? pOut / vBat : 0;
      const discharged = iDc * dtHours;
      const remaining = readBatteryRemainingAh(bat) - discharged;
      writeBatteryRemainingAh(bat, remaining);

      if (upsNode) {
        nodes[ups.id] = {
          ...upsNode,
          dcOutputPowerW: pOut,
          dcOutputCurrentA: iDc,
        };
      }

      if (nodes[bat.id]) {
        nodes[bat.id] = {
          ...nodes[bat.id],
          voltageV: effectiveBatteryVoltage(bat),
          energized: batteryCanSupply(bat),
          batteryRemainingAh: readBatteryRemainingAh(bat),
          batteryStateOfChargePct: batteryStateOfCharge(bat) * 100,
        };
      }

      if (!batteryCanSupply(bat)) {
        const label = ups.label?.trim() || 'UPS';
        faults.push({
          id: crypto.randomUUID(),
          type: 'overload',
          affectedComponentId: ups.id,
          message: `${label} battery depleted (${readBatteryRemainingAh(bat).toFixed(2)} Ah remaining) — inverter output disabled`,
          severity: 'critical',
          timestamp: wallMs,
        });
        ups.state = 'tripped';
        anyTripped = true;
        if (upsNode) {
          nodes[ups.id] = {
            ...upsNode,
            energized: false,
            voltageV: 0,
            currentA: 0,
            powerW: 0,
            powerVA: 0,
          };
        }
      }
      continue;
    }

    if (mains) {
      const cap = batteryCapacityAh(bat);
      const remaining = readBatteryRemainingAh(bat);
      if (remaining < cap * 0.995) {
        const iChg = upsChargeCurrentA(ups);
        const headroom = cap - remaining;
        const added = Math.min(headroom, iChg * dtHours);
        writeBatteryRemainingAh(bat, remaining + added);

        const vAc = ups.properties.voltage ?? defaultUpsAcVoltage(circuit);
        const pChg = iChg * Math.max(vBat, bat.properties.voltage ?? 24);
        const iAcChg = vAc > 0 ? pChg / vAc : iChg;

        if (upsNode) {
          nodes[ups.id] = {
            ...upsNode,
            currentA: iAcChg,
            fundamentalCurrentA: iAcChg,
            powerW: pChg,
            powerVA: vAc * iAcChg,
            upsBatteryChargeCurrentA: iChg,
            batteryStateOfChargePct: batteryStateOfCharge(bat) * 100,
          };
        }
        if (nodes[bat.id]) {
          nodes[bat.id] = {
            ...nodes[bat.id],
            voltageV: effectiveBatteryVoltage(bat),
            energized: batteryCanSupply(bat),
            batteryRemainingAh: readBatteryRemainingAh(bat),
            batteryStateOfChargePct: batteryStateOfCharge(bat) * 100,
          };
        }
      }
    }
  }

  return { faults, anyTripped };
}

function defaultUpsAcVoltage(circuit: Circuit): number {
  const src = circuit.components.find((c) => c.type === 'power_source');
  return src?.properties.voltage ?? 230;
}
