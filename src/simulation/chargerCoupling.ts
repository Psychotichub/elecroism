/**
 * AC/DC converter & SMPS primary-secondary coupling and overload behaviour.
 */

import type {
  Circuit,
  CircuitComponent,
  FaultEvent,
  NodeResult,
} from '../types';
import { isLoadComponent } from './componentClassification';
import { bfsFrom, terminalKey } from './engineTypes';
import type { PotentialSets } from './engineTypes';

export type ChargerCouplingSummary = {
  faults: FaultEvent[];
  anyTripped: boolean;
};

function isChargerType(c: CircuitComponent): boolean {
  return c.type === 'ac_dc_converter' || c.type === 'smps';
}

function findCp(component: CircuitComponent, label: string) {
  return component.connectionPoints.find(
    (cp) => cp.label.toUpperCase() === label.toUpperCase()
  );
}

function acInputVoltageV(c: CircuitComponent): number {
  if (c.type === 'ac_dc_converter') {
    return c.properties.acDcInputVoltageV ?? 230;
  }
  return 230;
}

function ratedOutputPowerW(c: CircuitComponent): number {
  const vDc = c.properties.voltage ?? 24;
  const rated = c.properties.powerWatts;
  if (rated != null && rated > 0) return rated;
  return vDc * 5;
}

function efficiencyFactor(c: CircuitComponent): number {
  const pct = c.properties.supplyEfficiencyPercent;
  if (pct != null && pct > 0) return Math.min(0.99, pct / 100);
  return c.type === 'smps' ? 0.88 : 0.6;
}

function inputPowerFactor(c: CircuitComponent): number {
  const pf = c.properties.inputPowerFactor;
  if (pf != null && pf > 0) return Math.min(1, pf);
  return c.type === 'smps' ? 0.65 : 0.7;
}

/** Sum real power (W) of loads on the charger DC bus. */
export function sumDownstreamDcLoadPowerW(
  charger: CircuitComponent,
  circuit: Circuit,
  graph: Map<string, Set<string>>,
  nodes: Record<string, NodeResult>
): number {
  const dcPlus = findCp(charger, 'DC_PLUS');
  const dcMinus = findCp(charger, 'DC_MINUS');
  if (!dcPlus || !dcMinus) return 0;

  const plusReach = bfsFrom(graph, [terminalKey(charger.id, dcPlus.id)]);
  const minusReach = bfsFrom(graph, [terminalKey(charger.id, dcMinus.id)]);

  let total = 0;
  for (const c of circuit.components) {
    if (c.id === charger.id || !isLoadComponent(c)) continue;
    const node = nodes[c.id];
    if (!node?.energized) continue;

    let onPlus = false;
    let onMinus = false;
    for (const cp of c.connectionPoints) {
      const key = terminalKey(c.id, cp.id);
      if (plusReach.has(key)) onPlus = true;
      if (minusReach.has(key)) onMinus = true;
    }
    if (!onPlus || !onMinus) continue;
    total += node.powerW ?? c.properties.powerWatts ?? 0;
  }
  return total;
}

/**
 * Primary AC fundamental current from DC load: I_AC = (V_DC × I_DC) / (V_AC × η × PF).
 */
export function acPrimaryFundamentalCurrentA(
  charger: CircuitComponent,
  dcOutputPowerW: number
): number {
  if (dcOutputPowerW <= 0) return 0;
  const vDc = charger.properties.voltage ?? 24;
  const iDc = vDc > 0 ? dcOutputPowerW / vDc : 0;
  const vAc = acInputVoltageV(charger);
  const eta = efficiencyFactor(charger);
  const pf = inputPowerFactor(charger);
  const denom = vAc * eta * pf;
  if (denom <= 0) return 0;
  return (vDc * iDc) / denom;
}

function chargerAcEnergized(
  charger: CircuitComponent,
  potentials: PotentialSets
): boolean {
  const acL = findCp(charger, 'AC_L');
  const acN = findCp(charger, 'AC_N');
  if (!acL || !acN) return false;
  const acLk = terminalKey(charger.id, acL.id);
  const acNk = terminalKey(charger.id, acN.id);
  const acHot =
    potentials.live.has(acLk) ||
    potentials.liveL1.has(acLk) ||
    potentials.liveL2.has(acLk) ||
    potentials.liveL3.has(acLk);
  return acHot && potentials.neutral.has(acNk);
}

/**
 * Couple DC bus loads to AC primary current; trip charger on output overload.
 */
export function applyChargerCoupling(
  circuit: Circuit,
  nodes: Record<string, NodeResult>,
  graph: Map<string, Set<string>>,
  potentials: PotentialSets,
  wallMs: number
): ChargerCouplingSummary {
  const faults: FaultEvent[] = [];
  let anyTripped = false;

  for (const charger of circuit.components) {
    if (!isChargerType(charger)) continue;
    if (charger.state === 'off' || charger.state === 'tripped') continue;

    const node = nodes[charger.id];
    if (!node) continue;

    const acOk = chargerAcEnergized(charger, potentials);
    if (!acOk) {
      nodes[charger.id] = {
        ...node,
        energized: false,
        voltageV: 0,
        currentA: 0,
        powerW: 0,
        powerVA: 0,
      };
      continue;
    }

    const pDc = sumDownstreamDcLoadPowerW(charger, circuit, graph, nodes);
    const vDc = charger.properties.voltage ?? 24;
    const iDc = vDc > 0 ? pDc / vDc : 0;
    const rated = ratedOutputPowerW(charger);
    const overload = pDc > rated * 1.02;

    if (overload) {
      const label = charger.label?.trim() || charger.type;
      faults.push({
        id: crypto.randomUUID(),
        type: 'overload',
        affectedComponentId: charger.id,
        message: `${label} output overload: ${pDc.toFixed(1)} W exceeds ${rated} W rated output — supply shut down`,
        severity: 'critical',
        timestamp: wallMs,
      });
      charger.state = 'tripped';
      anyTripped = true;
      nodes[charger.id] = {
        ...node,
        energized: false,
        voltageV: 0,
        currentA: 0,
        powerW: 0,
        powerVA: 0,
        dcOutputPowerW: pDc,
        dcOutputCurrentA: iDc,
      };
      continue;
    }

    const iAcFund = acPrimaryFundamentalCurrentA(charger, pDc);
    const vAc = acInputVoltageV(charger);
    const pf = inputPowerFactor(charger);
    const pAcIn = pDc / efficiencyFactor(charger);

    nodes[charger.id] = {
      ...node,
      energized: true,
      voltageV: vDc,
      currentA: iAcFund,
      fundamentalCurrentA: iAcFund,
      powerW: pAcIn,
      powerVA: vAc * iAcFund,
      powerFactor: pf,
      dcOutputPowerW: pDc,
      dcOutputCurrentA: iDc,
    };
  }

  return { faults, anyTripped };
}
