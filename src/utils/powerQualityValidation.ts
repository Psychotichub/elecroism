import type { Circuit, SimulationResult } from '../types';
import type { CircuitValidationIssue } from './circuitDesignValidation';
import { buildPowerQualityReport } from '../simulation/powerQuality';

/**
 * Flag elevated neutral harmonic current from triplen harmonics on 3φ + N.
 */
export function validatePowerQuality(
  circuit: Circuit,
  simulationResult: SimulationResult | null
): CircuitValidationIssue[] {
  const issues: CircuitValidationIssue[] = [];
  if (!simulationResult) return issues;

  const rows = buildPowerQualityReport(circuit, simulationResult);
  const neutralHarmonic = simulationResult.powerQualityNeutralHarmonicA ?? 0;
  const maxThd = simulationResult.powerQualityMaxThdPct ?? 0;

  if (neutralHarmonic > 10) {
    issues.push({
      id: 'pq-neutral-harmonic',
      severity: neutralHarmonic > 30 ? 'error' : 'warning',
      message: `Estimated neutral harmonic current ≈${neutralHarmonic.toFixed(1)} A from triplen (3rd-order) content on nonlinear loads — verify neutral conductor sizing (often 173% of phase current on heavily VFD/SMPS boards).`,
      componentIds: rows.map((r) => r.componentId),
    });
  }

  if (maxThd > 50) {
    issues.push({
      id: 'pq-high-thd',
      severity: 'warning',
      message: `Highest load THD ≈${maxThd.toFixed(0)}% — check upstream distortion, filter/mitigation, and RMS current for breaker/cable sizing.`,
      componentIds: rows.filter((r) => r.thdPercent >= maxThd - 0.1).map((r) => r.componentId),
    });
  }

  for (const row of rows) {
    if (row.rmsCurrentA > row.fundamentalCurrentA * 1.15) {
      issues.push({
        id: `pq-rms-${row.componentId}`,
        severity: 'info',
        message: `"${row.label}": RMS input ≈${row.rmsCurrentA.toFixed(2)} A vs ${row.fundamentalCurrentA.toFixed(2)} A fundamental (THD ${row.thdPercent.toFixed(0)}%) — size protection for RMS.`,
        componentIds: [row.componentId],
      });
    }
  }

  return issues;
}
