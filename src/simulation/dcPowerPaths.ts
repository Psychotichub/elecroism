/**
 * DC power-path propagation: sources, battery strings, chargers, UPS backup.
 */

import type { Circuit, CircuitComponent } from '../types';
import { terminalKey, tokenizeLabel, bfsFrom } from './engineTypes';
import type { PotentialSets } from './engineTypes';

export type DcSourceKind = 'dc_supply' | 'battery' | 'charger' | 'ups_inverter';

export function isDcPositiveLabel(label: string): boolean {
  const u = label.toUpperCase().trim();
  const tokens = tokenizeLabel(u);
  if (tokens.includes('PLUS') || tokens.includes('POS') || tokens.includes('POSITIVE')) {
    return true;
  }
  if (u === 'PWR_24V' || u === 'PWR_L' || u === 'DC_PLUS' || u === 'BAT_POS') return true;
  return /\b(DC_?\+|\+24V|\+)\b/.test(u);
}

export function isDcNegativeLabel(label: string): boolean {
  const u = label.toUpperCase().trim();
  const tokens = tokenizeLabel(u);
  if (tokens.includes('MINUS') || tokens.includes('NEG') || tokens.includes('NEGATIVE')) {
    return true;
  }
  if (u === 'PWR_0V' || u === 'PWR_N' || u === 'DC_MINUS' || u === 'BAT_NEG') return true;
  return /\b(DC_?-|0V|COM)\b/.test(u) && !u.includes('COMM');
}

/** Collect DC +/− seed terminals from explicit DC sources and battery strings. */
export function collectDcSourceSeeds(circuit: Circuit): {
  plus: string[];
  minus: string[];
} {
  const plus: string[] = [];
  const minus: string[] = [];
  for (const c of circuit.components) {
    if (c.state === 'off' || c.state === 'tripped') continue;
    if (c.type !== 'dc_power_source' && c.type !== 'dc_battery_backup') continue;
    for (const cp of c.connectionPoints) {
      const key = terminalKey(c.id, cp.id);
      if (isDcPositiveLabel(cp.label)) plus.push(key);
      else if (isDcNegativeLabel(cp.label)) minus.push(key);
    }
  }
  return { plus, minus };
}

function findCp(component: CircuitComponent, label: string) {
  return component.connectionPoints.find((cp) => cp.label.toUpperCase() === label);
}

/**
 * Extend live/neutral start lists from chargers (AC→DC) and UPS battery backup.
 * Returns true when any new seed was added.
 */
export function extendDcPowerSeeds(
  circuit: Circuit,
  liveStarts: string[],
  neutralStarts: string[],
  potentials: PotentialSets
): boolean {
  const { live, neutral, liveL1, liveL2, liveL3 } = potentials;
  let added = false;

  for (const c of circuit.components) {
    if (c.type !== 'ac_dc_converter' && c.type !== 'smps') continue;
    if (c.state === 'off' || c.state === 'tripped') continue;
    const acL = findCp(c, 'AC_L');
    const acN = findCp(c, 'AC_N');
    const dcPlus = findCp(c, 'DC_PLUS');
    const dcMinus = findCp(c, 'DC_MINUS');
    if (!acL || !acN || !dcPlus || !dcMinus) continue;
    const acLk = terminalKey(c.id, acL.id);
    const acNk = terminalKey(c.id, acN.id);
    const acHot =
      live.has(acLk) ||
      liveL1.has(acLk) ||
      liveL2.has(acLk) ||
      liveL3.has(acLk);
    if (!acHot || !neutral.has(acNk)) continue;
    const plusK = terminalKey(c.id, dcPlus.id);
    const minusK = terminalKey(c.id, dcMinus.id);
    if (!live.has(plusK)) {
      liveStarts.push(plusK);
      added = true;
    }
    if (!neutral.has(minusK)) {
      neutralStarts.push(minusK);
      added = true;
    }
  }

  for (const c of circuit.components) {
    if (c.type !== 'ups_module') continue;
    if (c.state === 'off' || c.state === 'tripped') continue;
    const acInL = findCp(c, 'AC_IN_L');
    const acInN = findCp(c, 'AC_IN_N');
    const acOutL = findCp(c, 'AC_OUT_L');
    const acOutN = findCp(c, 'AC_OUT_N');
    const batPos = findCp(c, 'BAT_POS');
    const batNeg = findCp(c, 'BAT_NEG');
    if (!acInL || !acInN || !acOutL || !acOutN) continue;

    const acInLk = terminalKey(c.id, acInL.id);
    const acInNk = terminalKey(c.id, acInN.id);
    const acOutLk = terminalKey(c.id, acOutL.id);
    const acOutNk = terminalKey(c.id, acOutN.id);
    const mainsPresent = live.has(acInLk) && neutral.has(acInNk);
    const inverterOn = c.properties.upsInverterEnabled !== false;

    if (!mainsPresent && inverterOn && batPos && batNeg) {
      const batPosK = terminalKey(c.id, batPos.id);
      const batNegK = terminalKey(c.id, batNeg.id);
      if (live.has(batPosK) && neutral.has(batNegK)) {
        if (!live.has(acOutLk)) {
          liveStarts.push(acOutLk);
          added = true;
        }
        if (!neutral.has(acOutNk)) {
          neutralStarts.push(acOutNk);
          added = true;
        }
      }
    }

    const staticBypass = c.properties.upsStaticBypass ?? false;
    if (staticBypass && mainsPresent) {
      if (!live.has(acOutLk)) {
        liveStarts.push(acOutLk);
        added = true;
      }
      if (!neutral.has(acOutNk)) {
        neutralStarts.push(acOutNk);
        added = true;
      }
    }
  }

  return added;
}

/** All DC conductor terminals reachable from DC seeds (for meter / indicator checks). */
export function getDcReachableKeys(
  circuit: Circuit,
  graph: Map<string, Set<string>>
): Set<string> {
  const seeds = collectDcSourceSeeds(circuit);
  const allSeeds = [...seeds.plus, ...seeds.minus];
  for (const c of circuit.components) {
    if (c.type !== 'ac_dc_converter' && c.type !== 'smps') continue;
    if (c.state === 'off' || c.state === 'tripped') continue;
    for (const cp of c.connectionPoints) {
      if (isDcPositiveLabel(cp.label) || isDcNegativeLabel(cp.label)) {
        allSeeds.push(terminalKey(c.id, cp.id));
      }
    }
  }
  return bfsFrom(graph, allSeeds);
}

export function componentVoltageFromDcPath(
  component: CircuitComponent,
  circuit: Circuit,
  potentials: PotentialSets,
  graph: Map<string, Set<string>>
): number | null {
  const dcReach = getDcReachableKeys(circuit, graph);
  let hasPlus = false;
  let hasMinus = false;
  for (const cp of component.connectionPoints) {
    const key = terminalKey(component.id, cp.id);
    if (!dcReach.has(key)) continue;
    if (potentials.live.has(key) || potentials.liveL1.has(key)) hasPlus = true;
    if (potentials.neutral.has(key)) hasMinus = true;
  }
  if (!hasPlus || !hasMinus) return null;

  if (component.type === 'dc_power_source' || component.type === 'dc_battery_backup') {
    return component.properties.voltage ?? 24;
  }
  if (component.type === 'ac_dc_converter' || component.type === 'smps') {
    return component.properties.voltage ?? 24;
  }
  if (component.type === 'ups_module') {
    const bat = circuit.components.find(
      (b) =>
        b.type === 'dc_battery_backup' &&
        b.state === 'on' &&
        component.connectionPoints.some((cp) => cp.label === 'BAT_POS')
    );
    if (bat) return bat.properties.voltage ?? 24;
    return component.properties.voltage ?? 230;
  }
  return null;
}

export function listDcSources(circuit: Circuit): {
  componentId: string;
  label: string;
  kind: DcSourceKind;
  voltageV: number;
}[] {
  const out: {
    componentId: string;
    label: string;
    kind: DcSourceKind;
    voltageV: number;
  }[] = [];
  for (const c of circuit.components) {
    if (c.state === 'off' || c.state === 'tripped') continue;
    if (c.type === 'dc_power_source') {
      out.push({
        componentId: c.id,
        label: c.label,
        kind: 'dc_supply',
        voltageV: c.properties.voltage ?? 24,
      });
    } else if (c.type === 'dc_battery_backup') {
      out.push({
        componentId: c.id,
        label: c.label,
        kind: 'battery',
        voltageV: c.properties.voltage ?? 24,
      });
    } else if (c.type === 'ac_dc_converter' || c.type === 'smps') {
      out.push({
        componentId: c.id,
        label: c.label,
        kind: 'charger',
        voltageV: c.properties.voltage ?? 24,
      });
    } else if (c.type === 'ups_module' && c.properties.upsInverterEnabled !== false) {
      out.push({
        componentId: c.id,
        label: c.label,
        kind: 'ups_inverter',
        voltageV: c.properties.voltage ?? 230,
      });
    }
  }
  return out;
}
