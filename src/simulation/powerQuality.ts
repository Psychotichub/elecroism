import type { Circuit, CircuitComponent, NodeResult, SimulationResult } from '../types';

/** Fraction of harmonic RMS assigned to 3rd-order (triplen) on nonlinear loads. */
export const DEFAULT_TRIPLEN_FRACTION = 0.7;

export type PowerQualitySummary = {
  maxThdPct: number;
  neutralHarmonicA: number;
  nonlinearLoadCount: number;
};

export type PowerQualityRow = {
  componentId: string;
  label: string;
  deviceType: string;
  thdPercent: number;
  fundamentalCurrentA: number;
  harmonicCurrentA: number;
  rmsCurrentA: number;
  triplenNeutralA: number;
};

const NONLINEAR_TYPES = new Set<CircuitComponent['type']>([
  'smps',
  'generic_load',
  'motor',
  'three_phase_motor',
  'heater',
  'lamp',
]);

function isThreePhaseLoad(c: CircuitComponent): boolean {
  if (c.type === 'three_phase_motor') {
    return c.properties.phaseSystem !== 'single_phase';
  }
  if (c.type === 'motor' || c.type === 'generic_load') {
    return c.properties.phaseSystem === 'three_phase';
  }
  return false;
}

/** Effective THD (%) for a component — SMPS/VFD defaults when unset. */
export function thdPercentOf(c: CircuitComponent): number {
  if (c.properties.thdPercent != null && c.properties.thdPercent >= 0) {
    return Math.min(100, c.properties.thdPercent);
  }
  if (c.type === 'smps') return 80;
  if (
    c.type === 'three_phase_motor' &&
    c.properties.motorDrive === 'vfd'
  ) {
    return 35;
  }
  return 0;
}

export function isNonlinearLoad(c: CircuitComponent): boolean {
  if (!NONLINEAR_TYPES.has(c.type)) return false;
  return thdPercentOf(c) > 0;
}

/** I_rms from fundamental and THD% (THD = I_h / I₁). */
export function rmsCurrentFromThd(
  fundamentalA: number,
  thdPercent: number
): number {
  if (fundamentalA <= 0 || thdPercent <= 0) return fundamentalA;
  const d = thdPercent / 100;
  return fundamentalA * Math.sqrt(1 + d * d);
}

/** Harmonic RMS current (A). */
export function harmonicRmsCurrentA(
  fundamentalA: number,
  thdPercent: number
): number {
  if (fundamentalA <= 0 || thdPercent <= 0) return 0;
  return fundamentalA * (thdPercent / 100);
}

/**
 * Neutral current from in-phase triplen harmonics on a balanced 3φ wye load.
 * I_N ≈ 3 × I_h3 per phase.
 */
export function triplenNeutralCurrentA(
  lineFundamentalA: number,
  thdPercent: number,
  triplenFraction = DEFAULT_TRIPLEN_FRACTION
): number {
  const iHarm = harmonicRmsCurrentA(lineFundamentalA, thdPercent);
  return 3 * iHarm * triplenFraction;
}

/** Single-phase nonlinear return current on neutral (3rd-dominated). */
export function singlePhaseNeutralHarmonicA(
  lineFundamentalA: number,
  thdPercent: number,
  triplenFraction = DEFAULT_TRIPLEN_FRACTION
): number {
  return harmonicRmsCurrentA(lineFundamentalA, thdPercent) * triplenFraction;
}

function fundamentalCurrentForComponent(
  c: CircuitComponent,
  node: NodeResult
): number {
  if (c.type === 'smps' || c.type === 'ac_dc_converter') {
    if (node.fundamentalCurrentA != null && node.fundamentalCurrentA > 0) {
      return node.fundamentalCurrentA;
    }
    return 0;
  }
  return node.lineCurrentRmsA ?? node.currentA ?? 0;
}

/**
 * Layer harmonic RMS and triplen neutral contribution onto load nodes.
 */
export function applyPowerQualityHarmonics(
  circuit: Circuit,
  nodes: Record<string, NodeResult>
): PowerQualitySummary {
  let maxThd = 0;
  let neutralHarmonic = 0;
  let nonlinearCount = 0;

  for (const c of circuit.components) {
    const node = nodes[c.id];
    if (!node?.energized) continue;

    const thd = thdPercentOf(c);
    if (thd <= 0) continue;

    const i1 = fundamentalCurrentForComponent(c, node);
    if (i1 <= 0) continue;

    const iHarm = harmonicRmsCurrentA(i1, thd);
    const iRms = rmsCurrentFromThd(i1, thd);
    const iTriplenN = isThreePhaseLoad(c)
      ? triplenNeutralCurrentA(i1, thd)
      : singlePhaseNeutralHarmonicA(i1, thd);

    if (isThreePhaseLoad(c)) {
      const baseN = node.currentNeutralA ?? 0;
      const combinedN = Math.hypot(baseN, iTriplenN);
      nodes[c.id] = {
        ...node,
        thdPercent: thd,
        fundamentalCurrentA: i1,
        harmonicCurrentA: iHarm,
        currentA: iRms,
        lineCurrentRmsA: iRms,
        currentNeutralA: combinedN,
        powerVA: (node.voltageV || node.lineVoltageRmsV || 400) * iRms,
      };
    } else {
      const v = node.voltageV || node.phaseVoltageRmsV || 230;
      nodes[c.id] = {
        ...node,
        thdPercent: thd,
        fundamentalCurrentA: i1,
        harmonicCurrentA: iHarm,
        currentA: iRms,
        powerVA: v * iRms,
      };
    }

    maxThd = Math.max(maxThd, thd);
    neutralHarmonic += iTriplenN;
    nonlinearCount += 1;
  }

  for (const c of circuit.components) {
    if (c.type !== 'power_quality_analyzer') continue;
    const node = nodes[c.id];
    if (!node?.energized) continue;
    const agg = aggregateForAnalyzer(circuit, nodes);
    nodes[c.id] = {
      ...node,
      thdPercent: agg.maxThdPct,
      harmonicCurrentA: agg.neutralHarmonicA,
      currentNeutralA: agg.neutralHarmonicA,
      fundamentalCurrentA: agg.nonlinearLoadCount > 0 ? node.currentA : 0,
    };
  }

  return {
    maxThdPct: maxThd,
    neutralHarmonicA: neutralHarmonic,
    nonlinearLoadCount: nonlinearCount,
  };
}

function aggregateForAnalyzer(
  circuit: Circuit,
  nodes: Record<string, NodeResult>
): PowerQualitySummary {
  let maxThd = 0;
  let neutralHarmonic = 0;
  let count = 0;
  for (const c of circuit.components) {
    if (!isNonlinearLoad(c)) continue;
    const n = nodes[c.id];
    if (!n?.energized || n.thdPercent == null) continue;
    maxThd = Math.max(maxThd, n.thdPercent);
    count += 1;
    const i1 = n.fundamentalCurrentA ?? n.currentA;
    if (isThreePhaseLoad(c)) {
      neutralHarmonic += triplenNeutralCurrentA(i1, n.thdPercent);
    } else {
      neutralHarmonic += singlePhaseNeutralHarmonicA(i1, n.thdPercent);
    }
  }
  return {
    maxThdPct: maxThd,
    neutralHarmonicA: neutralHarmonic,
    nonlinearLoadCount: count,
  };
}

export function buildPowerQualityReport(
  circuit: Circuit,
  simulationResult: SimulationResult | null
): PowerQualityRow[] {
  const nodes = simulationResult?.nodes ?? {};
  const rows: PowerQualityRow[] = [];

  for (const c of circuit.components) {
    if (!isNonlinearLoad(c)) continue;
    const n = nodes[c.id];
    if (!n?.energized) continue;
    const thd = n.thdPercent ?? thdPercentOf(c);
    const i1 = n.fundamentalCurrentA ?? fundamentalCurrentForComponent(c, n);
    const iHarm = n.harmonicCurrentA ?? harmonicRmsCurrentA(i1, thd);
    const iTriplen = isThreePhaseLoad(c)
      ? triplenNeutralCurrentA(i1, thd)
      : singlePhaseNeutralHarmonicA(i1, thd);

    rows.push({
      componentId: c.id,
      label: c.label?.trim() || c.type,
      deviceType: c.type.replace(/_/g, ' '),
      thdPercent: thd,
      fundamentalCurrentA: i1,
      harmonicCurrentA: iHarm,
      rmsCurrentA: n.currentA,
      triplenNeutralA: iTriplen,
    });
  }

  return rows.sort((a, b) => b.thdPercent - a.thdPercent);
}
