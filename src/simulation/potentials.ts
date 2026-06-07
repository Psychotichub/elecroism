/**
 * Potential propagation and supply detection module.
 * Extracted from the monolithic `engine.ts`.
 */

import type { Circuit, CircuitComponent, NodeResult } from '../types';
import {
  type PotentialSets,
  terminalKey,
  tokenizeLabel,
  bfsFrom,
  linePotentialAt,
  keyPotentialTag,
  splitTerminalKey,
} from './engineTypes';
import { collectDcSourceSeeds, extendDcPowerSeeds } from './dcPowerPaths';
import {
  calculatePluginCurrent,
  pluginSimConfigFromComponent,
} from './pluginSimulation';

/* ------------------------------------------------------------------ */
/*  Voltage defaults                                                  */
/* ------------------------------------------------------------------ */

export function defaultSinglePhaseLoadVoltage(circuit: Circuit): number {
  const ac = circuit.components.find((c) => c.type === 'power_source');
  if (ac) return ac.properties.voltage ?? 230;
  const dc = circuit.components.find((c) => c.type === 'dc_power_source');
  if (dc) return dc.properties.voltage ?? 24;
  return 230;
}

export function defaultDcLoadVoltage(circuit: Circuit): number {
  const dc = circuit.components.find((c) => c.type === 'dc_power_source');
  if (dc) return dc.properties.voltage ?? 24;
  const bat = circuit.components.find(
    (c) => c.type === 'dc_battery_backup' && c.state === 'on'
  );
  if (bat) return bat.properties.voltage ?? 24;
  const charger = circuit.components.find(
    (c) => c.type === 'ac_dc_converter' || c.type === 'smps'
  );
  if (charger) return charger.properties.voltage ?? 24;
  return 24;
}

export function getDefaultThreePhaseLineVoltage(circuit: Circuit): number {
  const src = circuit.components.find((c) => c.type === 'three_phase_source');
  return src?.properties.lineVoltage || src?.properties.voltage || 400;
}

/* ------------------------------------------------------------------ */
/*  Source start keys                                                 */
/* ------------------------------------------------------------------ */

export function getLiveStartKeys(circuit: Circuit): string[] {
  const keys: string[] = [];
  for (const source of circuit.components) {
    if (source.type !== 'power_source' && source.type !== 'dc_power_source') continue;
    if (source.state === 'off' || source.state === 'tripped') continue;
    for (const cp of source.connectionPoints) {
      const key = terminalKey(source.id, cp.id);
      const tokens = tokenizeLabel(cp.label);
      if (source.type === 'dc_power_source') {
        if (tokens.includes('PLUS')) keys.push(key);
        continue;
      }
      if (tokens.includes('L') || tokens.includes('LINE') || tokens.includes('PHASE')) {
        keys.push(key);
      }
    }
  }
  return keys;
}

export function getDcConductorStartKeys(circuit: Circuit): string[] {
  const keys: string[] = [];
  const dcSeeds = collectDcSourceSeeds(circuit);
  keys.push(...dcSeeds.plus, ...dcSeeds.minus);
  for (const source of circuit.components) {
    if (source.type !== 'ac_dc_converter' && source.type !== 'smps') continue;
    if (source.state === 'off' || source.state === 'tripped') continue;
    for (const cp of source.connectionPoints) {
      const key = terminalKey(source.id, cp.id);
      const tokens = tokenizeLabel(cp.label);
      if (tokens.includes('PLUS') || tokens.includes('MINUS')) keys.push(key);
    }
  }
  return keys;
}

export function getThreePhaseLineStartKeys(circuit: Circuit, phase: 1 | 2 | 3): string[] {
  const keys: string[] = [];
  const token = phase === 1 ? 'L1' : phase === 2 ? 'L2' : 'L3';
  for (const source of circuit.components) {
    if (source.type !== 'three_phase_source') continue;
    if (source.state === 'off' || source.state === 'tripped') continue;
    for (const cp of source.connectionPoints) {
      const t = tokenizeLabel(cp.label);
      if (t.includes(token)) keys.push(terminalKey(source.id, cp.id));
    }
  }
  return keys;
}

export function getAllLineConductorStartKeys(circuit: Circuit): string[] {
  return [
    ...getLiveStartKeys(circuit),
    ...getThreePhaseLineStartKeys(circuit, 1),
    ...getThreePhaseLineStartKeys(circuit, 2),
    ...getThreePhaseLineStartKeys(circuit, 3),
  ];
}

/* ------------------------------------------------------------------ */
/*  Potential propagation                                             */
/* ------------------------------------------------------------------ */

export function propagatePotentials(
  circuit: Circuit,
  graph: Map<string, Set<string>>
): PotentialSets {
  const liveStarts: string[] = [];
  const neutralStarts: string[] = [];
  const peStarts: string[] = [];
  const l1Starts: string[] = [];
  const l2Starts: string[] = [];
  const l3Starts: string[] = [];

  const dcSeeds = collectDcSourceSeeds(circuit);
  liveStarts.push(...dcSeeds.plus);
  neutralStarts.push(...dcSeeds.minus);

  for (const source of circuit.components) {
    if (source.type !== 'power_source') continue;
    if (source.state === 'off' || source.state === 'tripped') continue;
    for (const cp of source.connectionPoints) {
      const key = terminalKey(source.id, cp.id);
      const tokens = tokenizeLabel(cp.label);
      if (tokens.includes('L') || tokens.includes('LINE') || tokens.includes('PHASE')) {
        liveStarts.push(key);
      } else if (tokens.includes('N') || tokens.includes('NEUTRAL')) {
        neutralStarts.push(key);
      } else if (tokens.includes('PE') || tokens.includes('EARTH') || tokens.includes('GROUND')) {
        peStarts.push(key);
      }
    }
  }

  for (const source of circuit.components) {
    if (source.type !== 'three_phase_source') continue;
    if (source.state === 'off' || source.state === 'tripped') continue;
    for (const cp of source.connectionPoints) {
      const key = terminalKey(source.id, cp.id);
      const tokens = tokenizeLabel(cp.label);
      if (tokens.includes('L1')) l1Starts.push(key);
      else if (tokens.includes('L2')) l2Starts.push(key);
      else if (tokens.includes('L3')) l3Starts.push(key);
      else if (tokens.includes('N') || tokens.includes('NEUTRAL')) neutralStarts.push(key);
      else if (tokens.includes('PE') || tokens.includes('EARTH') || tokens.includes('GROUND')) peStarts.push(key);
    }
  }

  let live = bfsFrom(graph, liveStarts);
  let neutral = bfsFrom(graph, neutralStarts);
  const liveL1 = bfsFrom(graph, l1Starts);
  const liveL2 = bfsFrom(graph, l2Starts);
  const liveL3 = bfsFrom(graph, l3Starts);

  for (let iter = 0; iter < 8; iter++) {
    const added = extendDcPowerSeeds(circuit, liveStarts, neutralStarts, {
      live,
      neutral,
      pe: new Set(),
      liveL1,
      liveL2,
      liveL3,
    });
    if (!added) break;
    live = bfsFrom(graph, liveStarts);
    neutral = bfsFrom(graph, neutralStarts);
  }

  return { live, neutral, pe: bfsFrom(graph, peStarts), liveL1, liveL2, liveL3 };
}

/* ------------------------------------------------------------------ */
/*  Supply / polarity detection                                       */
/* ------------------------------------------------------------------ */

export function componentTouchesAnyPotential(
  component: CircuitComponent,
  potentials: PotentialSets
): boolean {
  return component.connectionPoints.some((cp) => {
    const key = terminalKey(component.id, cp.id);
    return linePotentialAt(potentials, key) || potentials.neutral.has(key) || potentials.pe.has(key);
  });
}

export function hasPolarityCorrectSupply(
  component: CircuitComponent,
  potentials: PotentialSets
): boolean {
  const roles = getRequiredPolarityRoles(component);
  if (!roles) return hasCompleteSupplyAnyTerminal(component, potentials);
  for (const role of roles) {
    const key = terminalKey(component.id, role.pointId);
    if (role.phase === 1 && !potentials.liveL1.has(key)) return false;
    if (role.phase === 2 && !potentials.liveL2.has(key)) return false;
    if (role.phase === 3 && !potentials.liveL3.has(key)) return false;
    if (role.needLive && !linePotentialAt(potentials, key)) return false;
    if (role.needNeutral && !potentials.neutral.has(key)) return false;
    if (role.needPe && !potentials.pe.has(key)) return false;
  }
  return true;
}

function getRequiredPolarityRoles(
  component: CircuitComponent
): { pointId: string; needLive: boolean; needNeutral: boolean; needPe: boolean; phase?: 1 | 2 | 3 }[] | null {
  switch (component.type) {
    case 'socket': {
      const out: { pointId: string; needLive: boolean; needNeutral: boolean; needPe: boolean; phase?: 1 | 2 | 3 }[] = [];
      for (const cp of component.connectionPoints) {
        const label = cp.label.toUpperCase();
        if (label === 'L') out.push({ pointId: cp.id, needLive: true, needNeutral: false, needPe: false });
        else if (label === 'N') out.push({ pointId: cp.id, needLive: false, needNeutral: true, needPe: false });
        else if (label === 'PE') out.push({ pointId: cp.id, needLive: false, needNeutral: false, needPe: true });
      }
      return out.length >= 2 ? out : null;
    }
    case 'lamp': case 'heater': case 'motor': case 'generic_load': {
      const t1 = component.connectionPoints.find((cp) => cp.label.toUpperCase() === 'T1');
      const t2 = component.connectionPoints.find((cp) => cp.label.toUpperCase() === 'T2');
      if (!t1 || !t2) return null;
      return [
        { pointId: t1.id, needLive: true, needNeutral: false, needPe: false },
        { pointId: t2.id, needLive: false, needNeutral: true, needPe: false },
      ];
    }
    case 'indicator_lamp': {
      const l = component.connectionPoints.find((cp) => cp.label.toUpperCase() === 'L');
      const n = component.connectionPoints.find((cp) => cp.label.toUpperCase() === 'N');
      if (!l || !n) return null;
      return [
        { pointId: l.id, needLive: true, needNeutral: false, needPe: false },
        { pointId: n.id, needLive: false, needNeutral: true, needPe: false },
      ];
    }
    case 'three_phase_motor': {
      const l1 = component.connectionPoints.find((cp) => cp.label.toUpperCase() === 'L1');
      const l2 = component.connectionPoints.find((cp) => cp.label.toUpperCase() === 'L2');
      const l3 = component.connectionPoints.find((cp) => cp.label.toUpperCase() === 'L3');
      const n = component.connectionPoints.find((cp) => cp.label.toUpperCase() === 'N');
      if (!l1 || !l2 || !l3 || !n) return null;
      return [
        { pointId: l1.id, needLive: false, needNeutral: false, needPe: false, phase: 1 },
        { pointId: l2.id, needLive: false, needNeutral: false, needPe: false, phase: 2 },
        { pointId: l3.id, needLive: false, needNeutral: false, needPe: false, phase: 3 },
        { pointId: n.id, needLive: false, needNeutral: true, needPe: false },
      ];
    }
    default: return null;
  }
}

function hasCompleteSupplyAnyTerminal(component: CircuitComponent, potentials: PotentialSets): boolean {
  let hasLive = false;
  let hasNeutral = false;
  for (const cp of component.connectionPoints) {
    const key = terminalKey(component.id, cp.id);
    if (linePotentialAt(potentials, key)) hasLive = true;
    if (potentials.neutral.has(key)) hasNeutral = true;
    if (hasLive && hasNeutral) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/*  Indicator lamp supply type matching                               */
/* ------------------------------------------------------------------ */

export function indicatorLampSupplyTypeMatches(
  component: CircuitComponent,
  circuit: Circuit,
  graph: Map<string, Set<string>>,
  potentials: PotentialSets
): boolean {
  if (component.type !== 'indicator_lamp') return true;
  const supplyType = component.properties.indicatorSupplyType ?? 'ac';
  const l = component.connectionPoints.find((cp) => cp.label.toUpperCase() === 'L');
  const n = component.connectionPoints.find((cp) => cp.label.toUpperCase() === 'N');
  if (!l || !n) return false;
  const lKey = terminalKey(component.id, l.id);
  const nKey = terminalKey(component.id, n.id);
  const dcReach = bfsFrom(graph, getDcConductorStartKeys(circuit));
  const dcPair = dcReach.has(lKey) && dcReach.has(nKey);
  if (supplyType === 'dc') return dcPair;
  const acPair = linePotentialAt(potentials, lKey) && potentials.neutral.has(nKey);
  return acPair && !dcPair;
}

/* ------------------------------------------------------------------ */
/*  Load current calculation                                          */
/* ------------------------------------------------------------------ */

export function calculateCurrent(component: CircuitComponent, voltage: number): number {
  const p = component.properties;
  const pf = component.properties.powerFactor ?? 1;
  const effectivePf = pf > 0 ? pf : 1;
  switch (component.type) {
    case 'lamp': case 'heater': case 'panel_heater': case 'cooling_fan': case 'generic_load':
      return (p.powerWatts || 60) / (voltage * effectivePf);
    case 'motor':
      return ((p.powerWatts || 1000) / (voltage * effectivePf)) * 1.25;
    case 'socket':
      return p.powerWatts ? p.powerWatts / (voltage * effectivePf) : 0;
    case 'indicator_lamp':
      return (p.powerWatts || 1) / (voltage * effectivePf);
    case 'plugin_component': {
      const cfg = pluginSimConfigFromComponent(component);
      return cfg ? calculatePluginCurrent(component, cfg, voltage) : 0;
    }
    default:
      return 0;
  }
}

/* ------------------------------------------------------------------ */
/*  Fault anchor detection                                            */
/* ------------------------------------------------------------------ */

export function getLiveSideAnchorsOfLineNeutralCrossWires(
  circuit: Circuit,
  potentials: PotentialSets
): Set<string> {
  const anchors = new Set<string>();
  for (const w of circuit.wires) {
    const fk = terminalKey(w.fromComponentId, w.fromPointId);
    const tk = terminalKey(w.toComponentId, w.toPointId);
    const fl = linePotentialAt(potentials, fk);
    const fn = potentials.neutral.has(fk);
    const tl = linePotentialAt(potentials, tk);
    const tn = potentials.neutral.has(tk);
    if (fl && tn) anchors.add(fk);
    if (fn && tl) anchors.add(tk);
  }
  return anchors;
}

export function getThreePhaseCrossPhaseAnchors(potentials: PotentialSets): Set<string> {
  const anchors = new Set<string>();
  for (const key of potentials.liveL1) {
    if (potentials.liveL2.has(key) || potentials.liveL3.has(key)) anchors.add(key);
  }
  for (const key of potentials.liveL2) {
    if (potentials.liveL3.has(key)) anchors.add(key);
  }
  return anchors;
}

export function formatFaultAnchorLocations(circuit: Circuit, anchors: Set<string>, limit = 3): string {
  if (anchors.size === 0) return '';
  const out: string[] = [];
  for (const key of anchors) {
    if (out.length >= limit) break;
    const parsed = splitTerminalKey(key);
    if (!parsed) continue;
    const component = circuit.components.find((c) => c.id === parsed.componentId);
    if (!component) continue;
    const cp = component.connectionPoints.find((p) => p.id === parsed.pointId);
    const termLabel = cp?.label ?? parsed.pointId;
    out.push(`${component.label}.${termLabel}`);
  }
  const hidden = anchors.size - out.length;
  if (hidden > 0) out.push(`+${hidden} more`);
  return out.join(', ');
}

/* ------------------------------------------------------------------ */
/*  Multimeter                                                        */
/* ------------------------------------------------------------------ */

export function estimateVoltageBetweenTags(
  a: 'N' | 'L' | 'L1' | 'L2' | 'L3' | 'NONE',
  b: 'N' | 'L' | 'L1' | 'L2' | 'L3' | 'NONE',
  circuit: Circuit,
  signal: 'ac' | 'dc'
): number {
  if (a === 'NONE' || b === 'NONE' || a === b) return 0;
  if (signal === 'dc') return defaultDcLoadVoltage(circuit);
  const vLL = getDefaultThreePhaseLineVoltage(circuit);
  const vLN = defaultSinglePhaseLoadVoltage(circuit);
  if (a === 'N' || b === 'N') return vLN;
  const threeA = a === 'L1' || a === 'L2' || a === 'L3';
  const threeB = b === 'L1' || b === 'L2' || b === 'L3';
  if (threeA && threeB) return vLL;
  return vLN;
}

function estimateDcVoltageBetweenProbeKeys(circuit: Circuit, probeAKey: string, probeBKey: string): number {
  const pickDcSourceVoltage = (key: string): number | null => {
    const parsed = splitTerminalKey(key);
    if (!parsed) return null;
    const comp = circuit.components.find((c) => c.id === parsed.componentId);
    if (!comp) return null;
    const cp = comp.connectionPoints.find((p) => p.id === parsed.pointId);
    if (!cp) return null;
    const lbl = cp.label.toUpperCase();
    if (!lbl.includes('PLUS') && !lbl.includes('MINUS')) return null;
    if (
      comp.type === 'dc_power_source' ||
      comp.type === 'dc_battery_backup' ||
      comp.type === 'ac_dc_converter' ||
      comp.type === 'smps'
    ) {
      return comp.properties.voltage ?? 24;
    }
    return null;
  };
  return pickDcSourceVoltage(probeAKey) ?? pickDcSourceVoltage(probeBKey) ?? defaultDcLoadVoltage(circuit);
}

function resolveMultimeterProbeKey(
  component: CircuitComponent, circuit: Circuit, which: 'com' | 'input'
): string | null {
  const p = component.properties as {
    multimeterComTargetComponentId?: string; multimeterComTargetPointId?: string;
    multimeterInputTargetComponentId?: string; multimeterInputTargetPointId?: string;
  };
  const targetComponentId = which === 'com' ? p.multimeterComTargetComponentId : p.multimeterInputTargetComponentId;
  const targetPointId = which === 'com' ? p.multimeterComTargetPointId : p.multimeterInputTargetPointId;
  if (!targetComponentId || !targetPointId) return null;
  const targetComp = circuit.components.find((c) => c.id === targetComponentId);
  if (!targetComp) return null;
  const targetPoint = targetComp.connectionPoints.find((cp) => cp.id === targetPointId);
  if (!targetPoint) return null;
  return terminalKey(targetComponentId, targetPointId);
}

export function measureMultimeter(
  component: CircuitComponent,
  circuit: Circuit,
  potentials: PotentialSets,
  graph: Map<string, Set<string>>
): { connected: boolean; voltageV: number; currentA: number; continuity: boolean; signal: 'ac' | 'dc' } {
  const com = component.connectionPoints.find((cp) => cp.label.toUpperCase() === 'COM');
  const input = component.connectionPoints.find((cp) => cp.label.toUpperCase().includes('V') || cp.label.includes('Ω'));
  if (!com || !input) return { connected: false, voltageV: 0, currentA: 0, continuity: false, signal: 'ac' };

  const kCom = resolveMultimeterProbeKey(component, circuit, 'com') ?? terminalKey(component.id, com.id);
  const kIn = resolveMultimeterProbeKey(component, circuit, 'input') ?? terminalKey(component.id, input.id);
  const connected = componentTouchesAnyPotential(component, potentials);
  const continuity = bfsFrom(graph, [kCom]).has(kIn);
  const tCom = keyPotentialTag(potentials, kCom);
  const tIn = keyPotentialTag(potentials, kIn);
  const selectedSignal = ((component.properties as { multimeterSignal?: 'auto' | 'ac' | 'dc' }).multimeterSignal ?? 'auto');
  const dcReach = bfsFrom(graph, getDcConductorStartKeys(circuit));
  const autoSignal: 'ac' | 'dc' = dcReach.has(kCom) && dcReach.has(kIn) ? 'dc' : 'ac';
  const signal = selectedSignal === 'auto' ? autoSignal : selectedSignal;
  const voltageV = signal === 'dc'
    ? estimateDcVoltageBetweenProbeKeys(circuit, kCom, kIn)
    : estimateVoltageBetweenTags(tCom, tIn, circuit, signal);
  return { connected, voltageV, currentA: 0, continuity, signal };
}

/* ------------------------------------------------------------------ */
/*  Wire state update                                                 */
/* ------------------------------------------------------------------ */

export function updateWireStates(
  circuit: Circuit,
  nodes: Record<string, NodeResult>,
  potentials: PotentialSets
): void {
  circuit.wires.forEach((wire) => {
    const fromKey = terminalKey(wire.fromComponentId, wire.fromPointId);
    const toKey = terminalKey(wire.toComponentId, wire.toPointId);
    const carriesPotential =
      linePotentialAt(potentials, fromKey) || linePotentialAt(potentials, toKey) ||
      potentials.neutral.has(fromKey) || potentials.neutral.has(toKey) ||
      potentials.pe.has(fromKey) || potentials.pe.has(toKey);
    const fromNode = nodes[wire.fromComponentId];
    const toNode = nodes[wire.toComponentId];
    wire.energized = carriesPotential;
    wire.currentAmps = carriesPotential ? Math.max(fromNode?.currentA || 0, toNode?.currentA || 0) : 0;
  });
}

export function updateMultimeterCurrentReadings(circuit: Circuit, nodes: Record<string, NodeResult>): void {
  for (const c of circuit.components) {
    if (c.type !== 'multimeter') continue;
    const node = nodes[c.id];
    if (!node) continue;
    const touching = circuit.wires.filter((w) => w.fromComponentId === c.id || w.toComponentId === c.id);
    if (touching.length === 0) { node.currentA = 0; continue; }
    node.currentA = touching.reduce((m, w) => Math.max(m, Math.abs(w.currentAmps || 0)), 0);
  }
}

/* ------------------------------------------------------------------ */
/*  Branch current through series device                              */
/* ------------------------------------------------------------------ */

export function getLoadLiveTerminalKey(component: CircuitComponent): string | null {
  if (component.type === 'socket' || component.type === 'indicator_lamp') {
    const cp = component.connectionPoints.find((p) => p.label.toUpperCase() === 'L');
    return cp ? terminalKey(component.id, cp.id) : null;
  }
  if (component.type === 'lamp' || component.type === 'heater' || component.type === 'motor' || component.type === 'generic_load') {
    const cp = component.connectionPoints.find((p) => p.label.toUpperCase() === 'T1');
    return cp ? terminalKey(component.id, cp.id) : null;
  }
  if (component.type === 'plugin_component') {
    const cfg = pluginSimConfigFromComponent(component);
    if (!cfg) return null;
    const cp = component.connectionPoints.find(
      (p) => p.label.toUpperCase() === cfg.liveTerminal.toUpperCase()
    );
    return cp ? terminalKey(component.id, cp.id) : null;
  }
  return null;
}

/** 3φ motor modeled on single-phase supply (one effective winding voltage). */
export function singleSuppliedThreePhaseMotorCurrentA(
  c: CircuitComponent,
  defaultSingleVoltage: number,
  energized: boolean
): { currentA: number; voltageV: number; phaseVoltageRmsV: number } {
  if (!energized) return { currentA: 0, voltageV: 0, phaseVoltageRmsV: 0 };
  const vPh = c.properties.phaseVoltage ?? (c.properties.lineVoltage != null ? c.properties.lineVoltage / Math.sqrt(3) : defaultSingleVoltage);
  const pf = c.properties.powerFactor ?? 0.8;
  const p = c.properties.powerWatts || 3000;
  const i = p > 0 ? (p / (vPh * pf)) * 1.25 : 0;
  return { currentA: i, voltageV: vPh, phaseVoltageRmsV: vPh };
}

export function shouldCheckMotorThermalNameplate(c: CircuitComponent): boolean {
  const r = c.properties.ratedLineAmps;
  if (r === undefined || r <= 0) return false;
  if (c.type === 'three_phase_motor') return c.properties.phaseSystem !== 'single_phase';
  if (c.type === 'motor') return c.properties.phaseSystem === 'three_phase';
  return false;
}
