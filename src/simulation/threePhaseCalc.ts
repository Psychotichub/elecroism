/**
 * Three-phase calculation module.
 *
 * Handles balanced / unbalanced current/voltage math, per-phase power
 * factors, neutral phasor summation, and three-phase display node
 * result merging.  Extracted from the monolithic `engine.ts`.
 */

import type {
  Circuit,
  CircuitComponent,
  NodeResult,
} from '../types';

/* ------------------------------------------------------------------ */
/*  Three-phase load classification                                   */
/* ------------------------------------------------------------------ */

/**
 * Balanced three-phase active power P = √3 V_L-L I_L PF → I_L = P/(√3 V_L-L PF).
 * Driven by `phaseSystem` on `motor`; `three_phase_motor` uses this unless
 * explicitly set to single-phase (single-winding / single-supply model).
 */
export function loadUsesBalancedThreePhaseMath(c: CircuitComponent): boolean {
  const ps = c.properties.phaseSystem;
  if (c.type === 'three_phase_motor') return ps !== 'single_phase';
  if (c.type === 'motor') return ps === 'three_phase';
  return false;
}

/** Use L1/L2/L3 reachability for branch-current sums (true 3φ motor symbol). */
export function loadUsesThreePhaseBranchReachability(c: CircuitComponent): boolean {
  return (
    c.type === 'three_phase_motor' &&
    c.properties.phaseSystem !== 'single_phase'
  );
}

/** True 3φ motor symbols that support optional per-phase current factors. */
export function motorSupportsPhaseUnbalanceModel(c: CircuitComponent): boolean {
  if (c.type === 'three_phase_motor')
    return c.properties.phaseSystem !== 'single_phase';
  if (c.type === 'motor') return c.properties.phaseSystem === 'three_phase';
  return false;
}

export function componentTypeUsesBalancedThreePhaseDisplay(type: string): boolean {
  return (
    type === 'three_phase_source' ||
    type === 'three_phase_contactor' ||
    type === 'four_phase_contactor' ||
    type === 'energy_meter' ||
    type === 'digital_multifunction_meter' ||
    type === 'three_phase_mcb' ||
    type === 'four_phase_mcb' ||
    type === 'motorized_mccb' ||
    type === 'four_pole_motorized_mccb' ||
    type === 'air_circuit_breaker' ||
    type === 'motor_protection_circuit_breaker' ||
    type === 'three_phase_motor' ||
    type === 'motor'
  );
}

/* ------------------------------------------------------------------ */
/*  Power factor helpers                                              */
/* ------------------------------------------------------------------ */

export function getPowerFactor(component: CircuitComponent): number {
  if (component.properties.powerFactor !== undefined) {
    return component.properties.powerFactor;
  }
  switch (component.properties.loadType) {
    case 'resistive':
      return 1.0;
    case 'inductive':
      return 0.8;
    case 'capacitive':
      return 0.95;
    default:
      return 1.0;
  }
}

function clampPhaseCurrentFactor(x: number): number {
  if (!Number.isFinite(x)) return 1;
  return Math.min(3, Math.max(0.05, x));
}

export function readPhaseCurrentFactors(c: CircuitComponent): [number, number, number] {
  const p = c.properties;
  return [
    clampPhaseCurrentFactor(p.threePhaseCurrentFactorL1 ?? 1),
    clampPhaseCurrentFactor(p.threePhaseCurrentFactorL2 ?? 1),
    clampPhaseCurrentFactor(p.threePhaseCurrentFactorL3 ?? 1),
  ];
}

function clampPhaseVoltageFactor(x: number): number {
  if (!Number.isFinite(x)) return 1;
  return Math.min(1.35, Math.max(0.65, x));
}

export function readPhaseVoltageFactors(c: CircuitComponent): [number, number, number] {
  const p = c.properties;
  return [
    clampPhaseVoltageFactor(p.threePhaseVoltageFactorL1 ?? 1),
    clampPhaseVoltageFactor(p.threePhaseVoltageFactorL2 ?? 1),
    clampPhaseVoltageFactor(p.threePhaseVoltageFactorL3 ?? 1),
  ];
}

export function readPhasePowerFactor(
  c: CircuitComponent,
  leg: 1 | 2 | 3
): number {
  const def = getPowerFactor(c);
  const p = c.properties;
  const raw =
    leg === 1
      ? p.threePhasePowerFactorL1
      : leg === 2
        ? p.threePhasePowerFactorL2
        : p.threePhasePowerFactorL3;
  if (raw === undefined || raw === null) return def;
  return Math.min(1, Math.max(0.05, raw));
}

/** Current angle vs phase voltage: lag (+) inductive, lead (−) capacitive. */
export function phaseCurrentAngleRad(c: CircuitComponent, pf: number): number {
  const mag = Math.acos(Math.max(0.05, Math.min(1, pf)));
  const lt = c.properties.loadType ?? 'inductive';
  if (lt === 'capacitive') return -mag;
  return mag;
}

/* ------------------------------------------------------------------ */
/*  Per-phase helpers                                                 */
/* ------------------------------------------------------------------ */

/** Per-phase real power (W); unset legs treated as 0. */
export function hasExplicitPerPhasePower(c: CircuitComponent): boolean {
  if (!motorSupportsPhaseUnbalanceModel(c)) return false;
  const p = c.properties;
  const w1 = p.powerWattsL1,
    w2 = p.powerWattsL2,
    w3 = p.powerWattsL3;
  if (w1 === undefined && w2 === undefined && w3 === undefined) return false;
  const sum =
    Math.max(0, w1 ?? 0) + Math.max(0, w2 ?? 0) + Math.max(0, w3 ?? 0);
  return sum > 0;
}

export function phaseWattsAtLeg(c: CircuitComponent, leg: 1 | 2 | 3): number {
  const p = c.properties;
  const v =
    leg === 1 ? p.powerWattsL1 : leg === 2 ? p.powerWattsL2 : p.powerWattsL3;
  if (v === undefined || v === null) return 0;
  return Math.max(0, v);
}

/* ------------------------------------------------------------------ */
/*  Neutral current phasor summation                                  */
/* ------------------------------------------------------------------ */

/**
 * RMS neutral current for wye line currents with phase angles θ_k = θ_Vk − φ_k
 * (V_a at 0, V_b at −120°, V_c at +120°; φ = arccos(PF) lag for inductive).
 */
export function neutralCurrentRmsWyePhasor(
  i1: number,
  i2: number,
  i3: number,
  phi1: number,
  phi2: number,
  phi3: number
): number {
  if (i1 <= 0 && i2 <= 0 && i3 <= 0) return 0;
  const addPh = (
    mag: number,
    angleV: number,
    phi: number
  ): { re: number; im: number } => {
    const th = angleV - phi;
    return { re: mag * Math.cos(th), im: mag * Math.sin(th) };
  };
  const a = addPh(i1, 0, phi1);
  const b = addPh(i2, (-2 * Math.PI) / 3, phi2);
  const c = addPh(i3, (2 * Math.PI) / 3, phi3);
  const re = a.re + b.re + c.re;
  const im = a.im + b.im + c.im;
  return Math.sqrt(re * re + im * im);
}

/* ------------------------------------------------------------------ */
/*  Per-phase L–N voltage resolution                                  */
/* ------------------------------------------------------------------ */

/** Per-phase L–N magnitudes (symmetric 120° phasors, mean scale = 1). */
export function resolvePerPhaseLNVoltages(
  component: CircuitComponent,
  vLL: number
): [number, number, number] {
  const base = vLL > 0 ? vLL / Math.sqrt(3) : 0;
  if (!motorSupportsPhaseUnbalanceModel(component)) {
    return [base, base, base];
  }
  const [f1, f2, f3] = readPhaseVoltageFactors(component);
  const m = (f1 + f2 + f3) / 3;
  if (m <= 0) return [base, base, base];
  return [
    (base * f1) / m,
    (base * f2) / m,
    (base * f3) / m,
  ];
}

/** |V_ab|, |V_bc|, |V_ca| from unbalanced |V_an|,|V_bn|,|V_cn| at 0°,±120°. */
export function lineToLineMagnitudesFromUnbalancedVLN(
  v1: number,
  v2: number,
  v3: number
): { u12: number; u23: number; u31: number } {
  const Va = { re: v1, im: 0 };
  const angB = (-2 * Math.PI) / 3;
  const Vb = { re: v2 * Math.cos(angB), im: v2 * Math.sin(angB) };
  const angC = (2 * Math.PI) / 3;
  const Vc = { re: v3 * Math.cos(angC), im: v3 * Math.sin(angC) };
  const sub = (
    p: { re: number; im: number },
    q: { re: number; im: number }
  ) => ({ re: p.re - q.re, im: p.im - q.im });
  const mag = (v: { re: number; im: number }) =>
    Math.sqrt(v.re * v.re + v.im * v.im);
  return {
    u12: mag(sub(Va, Vb)),
    u23: mag(sub(Vb, Vc)),
    u31: mag(sub(Vc, Va)),
  };
}

/* ------------------------------------------------------------------ */
/*  Explicit per-phase current magnitudes                             */
/* ------------------------------------------------------------------ */

/**
 * Line currents from explicit P_L1–P_L3 on each phase (wye, 4-wire).
 * Ignores current magnitude factors; uses per-phase PF and L–N voltages.
 */
export function computeExplicitPerPhaseCurrentMagnitudes(
  c: CircuitComponent,
  circuit: Circuit,
  energized: boolean,
  serviceFactor: number,
  getDefaultThreePhaseLineVoltage: (circuit: Circuit) => number
): { i1: number; i2: number; i3: number; vLL: number; vLN: [number, number, number] } | null {
  if (!hasExplicitPerPhasePower(c)) return null;
  const vLL =
    c.properties.lineVoltage || getDefaultThreePhaseLineVoltage(circuit);
  const [vLN1, vLN2, vLN3] = resolvePerPhaseLNVoltages(c, vLL);
  if (!energized) {
    return { i1: 0, i2: 0, i3: 0, vLL, vLN: [vLN1, vLN2, vLN3] };
  }
  const eps = 1e-3;
  const i1 =
    (phaseWattsAtLeg(c, 1) * serviceFactor) /
    Math.max(vLN1 * readPhasePowerFactor(c, 1), eps);
  const i2 =
    (phaseWattsAtLeg(c, 2) * serviceFactor) /
    Math.max(vLN2 * readPhasePowerFactor(c, 2), eps);
  const i3 =
    (phaseWattsAtLeg(c, 3) * serviceFactor) /
    Math.max(vLN3 * readPhasePowerFactor(c, 3), eps);
  return { i1, i2, i3, vLL, vLN: [vLN1, vLN2, vLN3] };
}

/* ------------------------------------------------------------------ */
/*  Balanced three-phase line current                                 */
/* ------------------------------------------------------------------ */

export function balancedThreePhaseLineCurrentA(
  c: CircuitComponent,
  circuit: Circuit,
  energized: boolean,
  serviceFactor: number,
  getDefaultThreePhaseLineVoltage: (circuit: Circuit) => number
): {
  currentA: number;
  voltageV: number;
  vLL: number;
  vPh: number;
} {
  if (!energized)
    return { currentA: 0, voltageV: 0, vLL: 0, vPh: 0 };
  const vLL =
    c.properties.lineVoltage ||
    getDefaultThreePhaseLineVoltage(circuit);
  const explicit = computeExplicitPerPhaseCurrentMagnitudes(
    c,
    circuit,
    energized,
    serviceFactor,
    getDefaultThreePhaseLineVoltage
  );
  if (explicit) {
    const { i1, i2, i3, vLN } = explicit;
    const vPh = (vLN[0] + vLN[1] + vLN[2]) / 3;
    return {
      currentA: Math.max(i1, i2, i3),
      voltageV: explicit.vLL,
      vLL: explicit.vLL,
      vPh,
    };
  }
  const pf = getPowerFactor(c);
  const p = c.properties.powerWatts || 0;
  const iLine =
    p > 0 ? (p / (Math.sqrt(3) * vLL * pf)) * serviceFactor : 0;
  return {
    currentA: iLine,
    voltageV: vLL,
    vLL,
    vPh: vLL / Math.sqrt(3),
  };
}

/* ------------------------------------------------------------------ */
/*  Per-phase current resolution for nodes                            */
/* ------------------------------------------------------------------ */

/**
 * Line currents L1–L3 and neutral: explicit per-phase watts, or scaled from
 * balanced I_line with optional current factors (mean 1).
 */
export function resolvePerPhaseLineCurrentsFromFactors(
  component: CircuitComponent,
  iLineBalanced: number
): { i1: number; i2: number; i3: number; iN: number } {
  const [f1, f2, f3] = readPhaseCurrentFactors(component);
  const meanF = (f1 + f2 + f3) / 3;
  if (meanF <= 0) {
    return {
      i1: iLineBalanced,
      i2: iLineBalanced,
      i3: iLineBalanced,
      iN: 0,
    };
  }
  const i1 = (iLineBalanced * f1) / meanF;
  const i2 = (iLineBalanced * f2) / meanF;
  const i3 = (iLineBalanced * f3) / meanF;
  const phi1 = phaseCurrentAngleRad(
    component,
    readPhasePowerFactor(component, 1)
  );
  const phi2 = phaseCurrentAngleRad(
    component,
    readPhasePowerFactor(component, 2)
  );
  const phi3 = phaseCurrentAngleRad(
    component,
    readPhasePowerFactor(component, 3)
  );
  const iN = neutralCurrentRmsWyePhasor(i1, i2, i3, phi1, phi2, phi3);
  return { i1, i2, i3, iN };
}

export function resolvePerPhaseLineCurrentsForNode(
  component: CircuitComponent,
  circuit: Circuit,
  node: NodeResult,
  getDefaultThreePhaseLineVoltage: (circuit: Circuit) => number
): { i1: number; i2: number; i3: number; iN: number } {
  if (!motorSupportsPhaseUnbalanceModel(component)) {
    const i = node.lineCurrentRmsA ?? node.currentA ?? 0;
    return { i1: i, i2: i, i3: i, iN: 0 };
  }
  const serviceFactor = component.type === 'motor' ? 1.25 : 1;
  const explicit = computeExplicitPerPhaseCurrentMagnitudes(
    component,
    circuit,
    node.energized,
    serviceFactor,
    getDefaultThreePhaseLineVoltage
  );
  if (explicit) {
    const phi1 = phaseCurrentAngleRad(
      component,
      readPhasePowerFactor(component, 1)
    );
    const phi2 = phaseCurrentAngleRad(
      component,
      readPhasePowerFactor(component, 2)
    );
    const phi3 = phaseCurrentAngleRad(
      component,
      readPhasePowerFactor(component, 3)
    );
    const iN = neutralCurrentRmsWyePhasor(
      explicit.i1,
      explicit.i2,
      explicit.i3,
      phi1,
      phi2,
      phi3
    );
    return {
      i1: explicit.i1,
      i2: explicit.i2,
      i3: explicit.i3,
      iN,
    };
  }
  const iLine = node.lineCurrentRmsA ?? node.currentA ?? 0;
  return resolvePerPhaseLineCurrentsFromFactors(component, iLine);
}

/* ------------------------------------------------------------------ */
/*  Three-phase display extras                                        */
/* ------------------------------------------------------------------ */

export function balancedThreePhaseExtrasFromCurrents(
  i1: number,
  i2: number,
  i3: number,
  iNeutral: number,
  vLN1: number,
  vLN2: number,
  vLN3: number,
  u12: number,
  u23: number,
  u31: number
): Pick<
  NodeResult,
  | 'currentL1A'
  | 'currentL2A'
  | 'currentL3A'
  | 'currentNeutralA'
  | 'voltageL1NV'
  | 'voltageL2NV'
  | 'voltageL3NV'
  | 'voltageL1L2V'
  | 'voltageL2L3V'
  | 'voltageL3L1V'
> {
  return {
    currentL1A: i1,
    currentL2A: i2,
    currentL3A: i3,
    currentNeutralA: iNeutral,
    voltageL1NV: vLN1,
    voltageL2NV: vLN2,
    voltageL3NV: vLN3,
    voltageL1L2V: u12,
    voltageL2L3V: u23,
    voltageL3L1V: u31,
  };
}

function resolveDisplayLineVoltageLl(
  component: CircuitComponent,
  circuit: Circuit,
  node: NodeResult,
  getDefaultThreePhaseLineVoltage: (circuit: Circuit) => number
): number {
  if (node.lineVoltageRmsV != null && node.lineVoltageRmsV > 0) {
    return node.lineVoltageRmsV;
  }
  if (node.phaseVoltageRmsV != null && node.phaseVoltageRmsV > 0) {
    return node.phaseVoltageRmsV * Math.sqrt(3);
  }
  const lv = component.properties.lineVoltage;
  if (typeof lv === 'number' && lv > 0) return lv;
  if (componentTypeUsesBalancedThreePhaseDisplay(component.type)) {
    return getDefaultThreePhaseLineVoltage(circuit);
  }
  return 0;
}

/**
 * Symmetric three-phase display (equal line currents, neutral 0, equal L–L).
 * Skipped for single-supplied `three_phase_motor` and for single-phase `motor`.
 */
export function mergeBalancedThreePhaseNodeResults(
  component: CircuitComponent,
  circuit: Circuit,
  node: NodeResult,
  getDefaultThreePhaseLineVoltage: (circuit: Circuit) => number
): NodeResult {
  if (
    component.type === 'three_phase_motor' &&
    component.properties.phaseSystem === 'single_phase'
  ) {
    return node;
  }
  if (
    component.type === 'motor' &&
    component.properties.phaseSystem !== 'three_phase'
  ) {
    return node;
  }
  if (!componentTypeUsesBalancedThreePhaseDisplay(component.type)) {
    return node;
  }
  const hasNominalVoltageOnNode =
    (node.lineVoltageRmsV != null && node.lineVoltageRmsV > 0) ||
    (node.phaseVoltageRmsV != null && node.phaseVoltageRmsV > 0);
  if (!node.energized && !hasNominalVoltageOnNode) {
    return node;
  }
  const vLL = resolveDisplayLineVoltageLl(component, circuit, node, getDefaultThreePhaseLineVoltage);
  if (vLL <= 0) {
    return node;
  }
  const { i1, i2, i3, iN } = resolvePerPhaseLineCurrentsForNode(
    component,
    circuit,
    node,
    getDefaultThreePhaseLineVoltage
  );
  const [vLN1, vLN2, vLN3] = resolvePerPhaseLNVoltages(
    component,
    vLL
  );
  let u12 = vLL;
  let u23 = vLL;
  let u31 = vLL;
  if (motorSupportsPhaseUnbalanceModel(component)) {
    const ll = lineToLineMagnitudesFromUnbalancedVLN(
      vLN1,
      vLN2,
      vLN3
    );
    u12 = ll.u12;
    u23 = ll.u23;
    u31 = ll.u31;
  }
  return {
    ...node,
    ...balancedThreePhaseExtrasFromCurrents(
      i1,
      i2,
      i3,
      iN,
      vLN1,
      vLN2,
      vLN3,
      u12,
      u23,
      u31
    ),
  };
}
