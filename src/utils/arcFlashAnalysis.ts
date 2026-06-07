import type { Circuit, CircuitComponent, SimulationResult } from '../types';
import { engine } from '../simulation/engine';
import { terminalKey } from '../simulation/engineTypes';
import type { CircuitValidationIssue } from './circuitDesignValidation';
import { computeProspectiveBoltedFaultA } from './faultLevelAnalysis';

export const PROTECTION_DEVICE_TYPES = new Set<CircuitComponent['type']>([
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

/** Default working distance (18 in) for incident energy at the device. */
export const DEFAULT_WORKING_DISTANCE_M = 0.457;

export type PpeCategory = '0' | '1' | '2' | '3' | '4';

export type ArcFlashRow = {
  deviceId: string;
  label: string;
  deviceType: string;
  voltageV: number;
  boltedFaultCurrentA: number;
  arcCurrentA: number;
  clearingTimeS: number;
  incidentEnergyCalCm2: number;
  arcFlashBoundaryM: number;
  ppeCategory: PpeCategory;
  workingDistanceM: number;
};

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
      if (c.type === 'three_phase_source' && (L === 'L1_OUT' || L === 'L2_OUT' || L === 'L3_OUT')) {
        live.add(k);
      }
    }
  }
  return live;
}

function nominalVoltageV(circuit: Circuit, device: CircuitComponent): number {
  if (
    device.type === 'three_phase_mcb' ||
    device.type === 'four_phase_mcb' ||
    device.type === 'air_circuit_breaker'
  ) {
    const src = circuit.components.find((x) => x.type === 'three_phase_source');
    return src?.properties.lineVoltage ?? src?.properties.voltage ?? 400;
  }
  const src = circuit.components.find((x) => x.type === 'power_source');
  return src?.properties.voltage ?? 230;
}

/**
 * Estimated clearing time for bolted fault (s) — magnetic vs thermal bands.
 */
export function estimateClearingTimeS(
  device: CircuitComponent,
  boltedFaultA: number
): number {
  const in_ = device.properties.ratingAmps ?? 16;
  const p = device.properties;

  if (device.type === 'air_circuit_breaker') {
    const hz = Math.max(40, Math.min(70, p.acbLineFrequencyHz ?? 50));
    const iiMult = Math.max(2, p.acbInstantaneousMult ?? 10);
    const stMult = Math.max(1.5, (p.acbShortTimeMult ?? 6));
    if (boltedFaultA >= in_ * iiMult) return 1 / (2 * hz) + 0.015;
    if (boltedFaultA >= in_ * stMult) return p.acbShortTimeDelayS ?? 0.18;
    return 1.5;
  }

  if (device.type === 'hrc_fuse' || device.type === 'control_circuit_fuse') {
    if (boltedFaultA >= in_ * 4) return 0.01;
    if (boltedFaultA >= in_ * 2) return 0.1;
    return 2;
  }

  const curve = (p.tripCurve ?? 'C').toString().toUpperCase();
  const magneticMult = curve === 'B' ? 5 : curve === 'D' ? 20 : 10;
  if (boltedFaultA >= in_ * magneticMult) return 0.02;
  if (boltedFaultA >= in_ * 1.45) return 0.35;
  return 5;
}

/**
 * Lee equation (simplified): E [cal/cm²] = 2.142×10⁶ × V[kV] × I[kA] × t[s] / D[in]²
 * with enclosure multiplier for panel devices.
 */
export function incidentEnergyLeeCalCm2(
  voltageV: number,
  arcCurrentA: number,
  clearingTimeS: number,
  workingDistanceM: number,
  enclosureFactor = 2.2
): number {
  if (workingDistanceM <= 0 || clearingTimeS <= 0 || arcCurrentA <= 0) return 0;
  const vKv = voltageV / 1000;
  const iKa = arcCurrentA / 1000;
  const dIn = workingDistanceM / 0.0254;
  const raw = (2.142e6 * vKv * iKa * clearingTimeS) / (dIn * dIn);
  return raw * enclosureFactor;
}

/** Distance (m) where incident energy equals threshold (default 1.2 cal/cm²). */
export function arcFlashBoundaryM(
  voltageV: number,
  arcCurrentA: number,
  clearingTimeS: number,
  thresholdCalCm2 = 1.2,
  enclosureFactor = 2.2
): number {
  if (arcCurrentA <= 0 || clearingTimeS <= 0) return 0;
  const vKv = voltageV / 1000;
  const iKa = arcCurrentA / 1000;
  const dIn = Math.sqrt(
    (2.142e6 * vKv * iKa * clearingTimeS * enclosureFactor) / thresholdCalCm2
  );
  return dIn * 0.0254;
}

export function ppeCategoryFromEnergy(calCm2: number): PpeCategory {
  if (calCm2 < 4) return '0';
  if (calCm2 < 8) return '1';
  if (calCm2 < 25) return '2';
  if (calCm2 < 40) return '3';
  return '4';
}

export type ProtectionFaultMetrics = {
  boltedFaultA: number;
  clearingTimeS: number;
  voltageV: number;
};

/** Prospective bolted fault + estimated clearing time for scope / arc-flash. */
export function getProtectionFaultMetrics(
  circuit: Circuit,
  deviceId: string,
  simulationResult: SimulationResult | null
): ProtectionFaultMetrics | null {
  const device = circuit.components.find((c) => c.id === deviceId);
  if (!device || !PROTECTION_DEVICE_TYPES.has(device.type)) return null;
  if (device.state === 'off') return null;

  const graph = engine.getTerminalGraphForValidation(
    structuredClone(circuit)
  );
  const liveSeeds = collectLiveSeeds(circuit);
  if (liveSeeds.size === 0) return null;

  const voltageV = nominalVoltageV(circuit, device);
  const boltedFaultA = computeProspectiveBoltedFaultA(
    circuit,
    graph,
    liveSeeds,
    device,
    simulationResult
  );
  const clearingTimeS = estimateClearingTimeS(device, boltedFaultA);
  return { boltedFaultA, clearingTimeS, voltageV };
}

export function buildArcFlashReport(
  circuit: Circuit,
  simulationResult: SimulationResult | null,
  workingDistanceM = DEFAULT_WORKING_DISTANCE_M
): ArcFlashRow[] {
  const clone = structuredClone(circuit);
  const graph = engine.getTerminalGraphForValidation(clone);
  const liveSeeds = collectLiveSeeds(circuit);
  if (liveSeeds.size === 0) return [];

  const rows: ArcFlashRow[] = [];
  for (const c of circuit.components) {
    if (!PROTECTION_DEVICE_TYPES.has(c.type)) continue;
    if (c.state === 'off') continue;

    const v = nominalVoltageV(circuit, c);
    const ibf = computeProspectiveBoltedFaultA(
      circuit,
      graph,
      liveSeeds,
      c,
      simulationResult
    );
    const iarc = ibf * 0.5;
    const t = estimateClearingTimeS(c, ibf);
    const enc =
      c.type === 'air_circuit_breaker' || c.type.includes('mccb') ? 2.8 : 2.2;
    const e = incidentEnergyLeeCalCm2(v, iarc, t, workingDistanceM, enc);
    const afb = arcFlashBoundaryM(v, iarc, t, 1.2, enc);

    rows.push({
      deviceId: c.id,
      label: c.label?.trim() || c.type,
      deviceType: c.type.replace(/_/g, ' '),
      voltageV: v,
      boltedFaultCurrentA: ibf,
      arcCurrentA: iarc,
      clearingTimeS: t,
      incidentEnergyCalCm2: e,
      arcFlashBoundaryM: afb,
      ppeCategory: ppeCategoryFromEnergy(e),
      workingDistanceM,
    });
  }

  return rows.sort((a, b) => b.incidentEnergyCalCm2 - a.incidentEnergyCalCm2);
}

export function validateArcFlash(
  circuit: Circuit,
  simulationResult: SimulationResult | null
): CircuitValidationIssue[] {
  const issues: CircuitValidationIssue[] = [];
  for (const row of buildArcFlashReport(circuit, simulationResult)) {
    if (row.incidentEnergyCalCm2 >= 40) {
      issues.push({
        id: `arcflash-cat4-${row.deviceId}`,
        severity: 'error',
        message: `"${row.label}": incident energy ≈ ${row.incidentEnergyCalCm2.toFixed(1)} cal/cm² — NFPA PPE Category ${row.ppeCategory} required. Arc-flash boundary ≈ ${row.arcFlashBoundaryM.toFixed(1)} m.`,
        componentIds: [row.deviceId],
      });
    } else if (row.incidentEnergyCalCm2 >= 8) {
      issues.push({
        id: `arcflash-high-${row.deviceId}`,
        severity: 'warning',
        message: `"${row.label}": incident energy ≈ ${row.incidentEnergyCalCm2.toFixed(1)} cal/cm² (Cat ${row.ppeCategory}) at ${(row.workingDistanceM * 39.37).toFixed(0)} in — review PPE and arc-flash label.`,
        componentIds: [row.deviceId],
      });
    }
  }
  return issues;
}

export function formatArcFlashLabel(row: ArcFlashRow, circuitName: string): string {
  const lines = [
    '══════════════════════════════════',
    '  ARC-FLASH WARNING LABEL (est.)',
    '══════════════════════════════════',
    `Circuit: ${circuitName}`,
    `Device:  ${row.label} (${row.deviceType})`,
    `Voltage: ${row.voltageV.toFixed(0)} V`,
    `Bolted fault: ${(row.boltedFaultCurrentA / 1000).toFixed(2)} kA`,
    `Arc current:  ${(row.arcCurrentA / 1000).toFixed(2)} kA (50% factor)`,
    `Clearing time: ${(row.clearingTimeS * 1000).toFixed(0)} ms`,
    `Incident energy: ${row.incidentEnergyCalCm2.toFixed(1)} cal/cm²`,
    `  @ ${(row.workingDistanceM * 39.37).toFixed(0)} in (${row.workingDistanceM.toFixed(2)} m)`,
    `Arc-flash boundary: ${row.arcFlashBoundaryM.toFixed(2)} m`,
    `Minimum PPE: Category ${row.ppeCategory}`,
    '──────────────────────────────────',
    'Simplified Lee / IEEE 1584 estimate.',
    'Verify with site study before work.',
    '══════════════════════════════════',
  ];
  return lines.join('\n');
}

export function downloadArcFlashLabel(
  row: ArcFlashRow,
  circuitName: string
): void {
  const text = formatArcFlashLabel(row, circuitName);
  const safe = row.label.replace(/[^\w-]+/g, '_').slice(0, 40) || 'device';
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${circuitName.replace(/[^\w-]+/g, '_')}-${safe}-arc-flash.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
