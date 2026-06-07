/**
 * Per-conductor R + X from length and cross-section (IEC-style simplification).
 * Shared by load-flow, cable wizard, and validation.
 */

/** Schematic world units → metres (one grid cell ≈ 25 cm). */
export const METERS_PER_GRID_UNIT = 0.25;

/** Copper resistivity Ω·mm²/m at ~70 °C working temperature. */
export const COPPER_RESISTIVITY = 0.0225;

/** Flat reactance approximation (Ω/m per conductor). */
export function reactancePerMeter(crossSectionMm2: number): number {
  if (crossSectionMm2 <= 120) return 0.00008;
  return 0.00007;
}

export function polylineLengthWorld(points: number[]): number {
  if (points.length < 4) return 0;
  let len = 0;
  for (let i = 0; i < points.length - 2; i += 2) {
    len += Math.hypot(points[i + 2] - points[i], points[i + 3] - points[i + 1]);
  }
  return len;
}

/** One-way cable run length in metres from wire polyline and circuit grid. */
export function wireLengthMeters(
  points: number[],
  gridSize: number
): number {
  if (gridSize <= 0) return 0;
  const worldLen = polylineLengthWorld(points);
  return (worldLen / gridSize) * METERS_PER_GRID_UNIT;
}

export function conductorResistanceOhms(
  crossSectionMm2: number,
  lengthM: number,
  material: 'copper' | 'aluminium' = 'copper'
): number {
  if (crossSectionMm2 <= 0 || lengthM <= 0) return 0;
  const rho = material === 'copper' ? COPPER_RESISTIVITY : 0.036;
  return (rho * lengthM) / crossSectionMm2;
}

export function conductorReactanceOhms(
  crossSectionMm2: number,
  lengthM: number
): number {
  if (lengthM <= 0) return 0;
  return reactancePerMeter(crossSectionMm2) * lengthM;
}

/** Magnitude of loop impedance for voltage-drop (R cos φ + X sin φ) per conductor. */
export function effectiveImpedanceOhms(
  crossSectionMm2: number,
  lengthM: number,
  powerFactor: number,
  material: 'copper' | 'aluminium' = 'copper'
): number {
  const r = conductorResistanceOhms(crossSectionMm2, lengthM, material);
  const x = conductorReactanceOhms(crossSectionMm2, lengthM);
  const cosP = Math.max(0.05, Math.min(1, powerFactor));
  const sinP = Math.sqrt(Math.max(0, 1 - cosP * cosP));
  return r * cosP + x * sinP;
}

/** Loop voltage drop (both conductors) for sizing checks. */
export function loopVoltageDropV(
  currentA: number,
  crossSectionMm2: number,
  lengthM: number,
  powerFactor: number,
  phaseConfig: 'single_phase' | 'three_phase' = 'single_phase',
  material: 'copper' | 'aluminium' = 'copper'
): number {
  if (currentA <= 0 || lengthM <= 0) return 0;
  const zPerM = effectiveImpedanceOhms(crossSectionMm2, 1, powerFactor, material);
  const factor = phaseConfig === 'three_phase' ? Math.sqrt(3) : 2;
  return currentA * lengthM * zPerM * factor;
}
