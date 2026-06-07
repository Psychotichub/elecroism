import type { Circuit, CircuitComponent, SimulationResult } from '../types';

const LOAD_TYPES = new Set<CircuitComponent['type']>([
  'lamp',
  'motor',
  'three_phase_motor',
  'heater',
  'panel_heater',
  'cooling_fan',
  'generic_load',
  'socket',
]);

const SUPPLY_TYPES = new Set<CircuitComponent['type']>([
  'power_source',
  'three_phase_source',
  'smps',
  'dc_power_source',
]);

function round(n: number | undefined, digits: number): number {
  if (n === undefined || !Number.isFinite(n)) return 0;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export type SimulationEnergizationSnapshot = {
  success: boolean;
  loads: Array<{
    label: string;
    type: string;
    energized: boolean;
    voltageV: number;
    currentA: number;
    powerW: number;
  }>;
  supplies: Array<{
    label: string;
    type: string;
    energized: boolean;
  }>;
  faultTypes: string[];
  shortCircuitCount: number;
  totalPowerW: number;
  totalCurrentA: number;
};

/** Stable, timestamp-free view of simulation energization for snapshot tests. */
export function buildSimulationEnergizationSnapshot(
  circuit: Circuit,
  result: SimulationResult
): SimulationEnergizationSnapshot {
  const loads = circuit.components
    .filter((c) => LOAD_TYPES.has(c.type))
    .map((c) => {
      const n = result.nodes[c.id];
      return {
        label: c.label,
        type: c.type,
        energized: n?.energized ?? false,
        voltageV: round(n?.voltageV, 1),
        currentA: round(n?.currentA, 2),
        powerW: round(n?.powerW, 0),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const supplies = circuit.components
    .filter((c) => SUPPLY_TYPES.has(c.type))
    .map((c) => ({
      label: c.label,
      type: c.type,
      energized: result.nodes[c.id]?.energized ?? false,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return {
    success: result.success,
    loads,
    supplies,
    faultTypes: [...result.faults.map((f) => f.type)].sort(),
    shortCircuitCount: result.faults.filter((f) => f.type === 'short_circuit')
      .length,
    totalPowerW: round(result.totalPowerW, 0),
    totalCurrentA: round(result.totalCurrentA, 2),
  };
}
