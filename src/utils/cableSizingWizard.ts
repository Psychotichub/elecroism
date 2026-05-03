/**
 * Cable Sizing & Voltage Drop Wizard — core engineering calculations.
 *
 * References (simplified):
 *   • IEC 60364-5-52 cable ampacity (Method C — clipped direct, single layer)
 *   • Copper resistivity ≈ 0.0175 Ω·mm²/m at 70 °C (working temp)
 *   • Reactance ≈ 0.08 mΩ/m per conductor for ≤ 120 mm²
 *
 * This module is purposely self-contained: no runtime dependency on the
 * simulation engine, so it can be tested and used independently.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** User-selectable installation method (derating envelope). */
export type InstallationMethod =
  | 'clipped_direct'     // Method C — single circuit on wall/ceiling
  | 'enclosed_conduit'   // Method B — in conduit / trunking
  | 'cable_tray'         // Method E — perforated tray, single layer
  | 'free_air'           // Method F / G — freely suspended
  | 'buried_direct';     // Method D — direct buried

/** Cable material. */
export type ConductorMaterial = 'copper' | 'aluminium';

/** Single-phase (L + N) or three-phase (L1 L2 L3 + N). */
export type PhaseConfig = 'single_phase' | 'three_phase';

/** Input parameters the user provides. */
export interface CableSizingInput {
  /** Load real power (kW). */
  loadKw: number;
  /** Cable run one-way length (metres). */
  distanceM: number;
  /** Nominal system voltage (V); 230 V single-phase, 400 V three-phase, etc. */
  voltageV: number;
  /** Power factor (0…1); default 0.85 if omitted. */
  powerFactor: number;
  /** Phase configuration. */
  phaseConfig: PhaseConfig;
  /** Installation method for derating. */
  installationMethod: InstallationMethod;
  /** Conductor material. */
  conductorMaterial: ConductorMaterial;
  /** Maximum acceptable voltage drop at the load end (%). */
  maxVoltageDropPct: number;
  /** Ambient temperature (°C); default 30 if omitted. */
  ambientTempC: number;
}

/** Result of the sizing calculation for one cable size. */
export interface CableSizingCandidate {
  /** Nominal cross-section (mm²). */
  crossSectionMm2: number;
  /** Derated continuous ampacity (A). */
  deratedAmpacity: number;
  /** Calculated line current the load draws (A). */
  loadCurrentA: number;
  /** Voltage drop across the cable run (V). */
  voltageDropV: number;
  /** Voltage drop as a percentage of nominal voltage. */
  voltageDropPct: number;
  /** Does this size satisfy both ampacity and voltage drop? */
  ok: boolean;
}

/** Full result from the wizard. */
export interface CableSizingResult {
  /** Calculated line current at the supply end (A). */
  loadCurrentA: number;
  /** All candidates evaluated (ascending by size). */
  candidates: CableSizingCandidate[];
  /** The smallest cable size that passes both checks (or null if none does). */
  recommended: CableSizingCandidate | null;
  /** Human-readable summary. */
  summary: string;
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

/**
 * Standard IEC cross-sections (mm²).
 * We evaluate every one and pick the smallest that passes.
 */
export const STANDARD_CROSS_SECTIONS = [
  0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240,
] as const;

/**
 * Base ampacity (A) for copper conductor, single circuit, Method C (clipped
 * direct) at 30 °C ambient, 70 °C conductor. PVC insulation, 2-core or 3-core.
 * Values are approximate IEC-60364-5-52 Table B.52.4 col 5 (2-loaded).
 */
const BASE_AMPACITY_CU: Record<number, number> = {
  0.5: 4,
  0.75: 7,
  1: 10,
  1.5: 15.5,
  2.5: 21,
  4: 28,
  6: 36,
  10: 50,
  16: 68,
  25: 89,
  35: 110,
  50: 133,
  70: 171,
  95: 207,
  120: 239,
  150: 275,
  185: 314,
  240: 370,
};

/**
 * Derating factors by installation method relative to Method C base.
 * These are simplified representative multipliers.
 */
const METHOD_DERATING: Record<InstallationMethod, number> = {
  clipped_direct: 1.0,
  enclosed_conduit: 0.87,
  cable_tray: 1.05,
  free_air: 1.15,
  buried_direct: 0.90,
};

/**
 * Ambient temperature correction factor (PVC insulated cable, 70 °C max).
 * k = √((Tc − Ta) / (Tc − Tref)), Tc = 70, Tref = 30.
 */
function ambientDerating(ambientC: number): number {
  const tc = 70; // conductor max
  const tRef = 30; // reference ambient
  const num = tc - ambientC;
  if (num <= 0) return 0.1; // cable cannot carry current if ambient ≥ 70 °C
  return Math.sqrt(num / (tc - tRef));
}

/**
 * Aluminium has ~61 % of copper conductivity; ampacity is roughly 79 % of Cu
 * for the same cross-section (√(0.61) ≈ 0.78).
 */
const AL_FACTOR = 0.79;

// ---------------------------------------------------------------------------
// Electrical formulas
// ---------------------------------------------------------------------------

/**
 * Resistivity (Ω·mm²/m) at operating temperature.
 * Cu ≈ 0.0225 at 70 °C; Al ≈ 0.036 at 70 °C.
 */
function resistivity(mat: ConductorMaterial): number {
  return mat === 'copper' ? 0.0225 : 0.036;
}

/**
 * Reactance per conductor (Ω/m) — flat approximation for multicore cables.
 * Largely constant at low frequencies; 0.08 mΩ/m up to ~120 mm², slightly less
 * for larger sizes.
 */
function reactancePerM(crossMm2: number): number {
  if (crossMm2 <= 16) return 0.00008;
  if (crossMm2 <= 120) return 0.00008;
  return 0.00007;
}

/**
 * Line current (A) from load power.
 *   Single-phase:  I = P / (V × PF)
 *   Three-phase:   I = P / (√3 × V × PF)
 */
export function loadCurrent(
  powerW: number,
  voltageV: number,
  pf: number,
  phaseConfig: PhaseConfig
): number {
  if (voltageV <= 0 || pf <= 0) return 0;
  return phaseConfig === 'three_phase'
    ? powerW / (Math.sqrt(3) * voltageV * pf)
    : powerW / (voltageV * pf);
}

/**
 * Voltage drop across a cable run.
 *   ΔV = I × 2L × (R cos φ + X sin φ) / (n × A)
 * where n = number of parallel circuits (1 here), A = cross-section,
 * R = ρ/A Ω/m, X per metre.
 *
 * For three-phase, the factor is √3 instead of 2 (line voltage reference).
 */
export function voltageDrop(
  currentA: number,
  distanceM: number,
  crossMm2: number,
  pf: number,
  phaseConfig: PhaseConfig,
  mat: ConductorMaterial
): number {
  if (crossMm2 <= 0 || currentA <= 0) return 0;
  const rho = resistivity(mat);
  const r = rho / crossMm2; // Ω per m per conductor
  const x = reactancePerM(crossMm2);
  const cosP = pf;
  const sinP = Math.sqrt(1 - pf * pf);
  const zEff = r * cosP + x * sinP; // effective impedance per m per conductor
  const factor = phaseConfig === 'three_phase' ? Math.sqrt(3) : 2;
  return currentA * distanceM * zEff * factor;
}

// ---------------------------------------------------------------------------
// Main wizard function
// ---------------------------------------------------------------------------

export function runCableSizingWizard(input: CableSizingInput): CableSizingResult {
  const {
    loadKw,
    distanceM,
    voltageV,
    powerFactor,
    phaseConfig,
    installationMethod,
    conductorMaterial,
    maxVoltageDropPct,
    ambientTempC,
  } = input;

  const powerW = loadKw * 1000;
  const iLoad = loadCurrent(powerW, voltageV, powerFactor, phaseConfig);
  const methodK = METHOD_DERATING[installationMethod];
  const tempK = ambientDerating(ambientTempC);
  const matK = conductorMaterial === 'aluminium' ? AL_FACTOR : 1;

  const candidates: CableSizingCandidate[] = STANDARD_CROSS_SECTIONS.map(
    (cs) => {
      const baseIz = BASE_AMPACITY_CU[cs] ?? 10;
      const iz = baseIz * methodK * tempK * matK;
      const vd = voltageDrop(iLoad, distanceM, cs, powerFactor, phaseConfig, conductorMaterial);
      const vdPct = voltageV > 0 ? (vd / voltageV) * 100 : 0;
      const ampOk = iz >= iLoad;
      const vdOk = vdPct <= maxVoltageDropPct;
      return {
        crossSectionMm2: cs,
        deratedAmpacity: Math.round(iz * 10) / 10,
        loadCurrentA: Math.round(iLoad * 100) / 100,
        voltageDropV: Math.round(vd * 100) / 100,
        voltageDropPct: Math.round(vdPct * 100) / 100,
        ok: ampOk && vdOk,
      };
    }
  );

  const recommended = candidates.find((c) => c.ok) ?? null;

  let summary: string;
  if (recommended) {
    summary =
      `Recommended cable: ${recommended.crossSectionMm2} mm² ` +
      `${conductorMaterial === 'aluminium' ? 'Al' : 'Cu'} ` +
      `(${installationMethod.replace(/_/g, ' ')}). ` +
      `Load current ≈ ${recommended.loadCurrentA.toFixed(1)} A, ` +
      `derated ampacity ≈ ${recommended.deratedAmpacity.toFixed(0)} A, ` +
      `voltage drop ≈ ${recommended.voltageDropV.toFixed(1)} V ` +
      `(${recommended.voltageDropPct.toFixed(1)} %).`;
  } else {
    summary =
      `No standard cable size satisfies both ampacity and ` +
      `${maxVoltageDropPct}% voltage drop at the given parameters. ` +
      `Consider parallel cables, a shorter run, or a higher voltage.`;
  }

  return {
    loadCurrentA: Math.round(iLoad * 100) / 100,
    candidates,
    recommended,
    summary,
  };
}

/** Human-readable label for an installation method. */
export const INSTALLATION_METHOD_LABELS: Record<InstallationMethod, string> = {
  clipped_direct: 'Clipped direct (Method C)',
  enclosed_conduit: 'In conduit / trunking (Method B)',
  cable_tray: 'Perforated cable tray (Method E)',
  free_air: 'Free air / suspended (Method F)',
  buried_direct: 'Direct buried (Method D)',
};
