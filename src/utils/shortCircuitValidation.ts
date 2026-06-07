import type { Circuit, CircuitComponent, SimulationResult } from '../types';
import type { CircuitValidationIssue } from './circuitDesignValidation';
import { buildFaultLevelReport } from './faultLevelAnalysis';

/** Upper cap for prospective bolted fault level (A) in teaching model. */
export const PROSPECTIVE_SHORT_CIRCUIT_A = 5000;

const PROTECTION_TYPES = new Set<CircuitComponent['type']>([
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

function breakingCapacityAmps(c: CircuitComponent): number | null {
  const bc = c.properties.breakingCapacity;
  if (bc == null || !Number.isFinite(bc)) return null;
  return bc;
}

/**
 * Warn when a protective device's rupturing capacity is below the impedance-based
 * prospective short-circuit level at that point, or when simulated branch current exceeds it.
 */
export function validateBreakingCapacity(
  circuit: Circuit,
  simulationResult: SimulationResult | null
): CircuitValidationIssue[] {
  const issues: CircuitValidationIssue[] = [];
  const hasShortFault =
    simulationResult?.faults.some((f) => f.type === 'short_circuit') ?? false;

  const faultByDevice = new Map<string, number>();
  if (simulationResult?.prospectiveFaultLevels) {
    for (const [id, a] of Object.entries(simulationResult.prospectiveFaultLevels)) {
      faultByDevice.set(id, a);
    }
  } else {
    for (const row of buildFaultLevelReport(circuit, simulationResult)) {
      faultByDevice.set(row.deviceId, row.faultCurrentA);
    }
  }

  const globalIsc =
    simulationResult?.maxProspectiveFaultA ?? PROSPECTIVE_SHORT_CIRCUIT_A;

  for (const c of circuit.components) {
    if (!PROTECTION_TYPES.has(c.type)) continue;
    const icu = breakingCapacityAmps(c);
    if (icu == null) continue;

    const node = simulationResult?.nodes[c.id];
    const branchA = node?.currentA ?? 0;
    const isc = faultByDevice.get(c.id) ?? globalIsc;

    if (icu < isc) {
      issues.push({
        id: `isc-capacity-${c.id}`,
        severity: 'error',
        message: `"${c.label}": breaking capacity ${(icu / 1000).toFixed(1)} kA is below prospective fault ${(isc / 1000).toFixed(2)} kA at this point — device may not safely interrupt a bolted fault.`,
        componentIds: [c.id],
      });
      continue;
    }

    if (hasShortFault && branchA >= icu * 0.95) {
      issues.push({
        id: `isc-over-${c.id}`,
        severity: 'error',
        message: `"${c.label}": simulated fault current ${branchA.toFixed(0)} A exceeds or matches rupturing capacity ${icu} A during a short-circuit event.`,
        componentIds: [c.id],
      });
    } else if (branchA > icu * 0.8 && branchA > (c.properties.ratingAmps ?? 16) * 3) {
      issues.push({
        id: `isc-margin-${c.id}`,
        severity: 'warning',
        message: `"${c.label}": branch current ${branchA.toFixed(0)} A is high relative to ${icu} A breaking capacity — verify coordination and fault level (${(isc / 1000).toFixed(2)} kA prospective).`,
        componentIds: [c.id],
      });
    }
  }

  return issues;
}
