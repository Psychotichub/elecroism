import type { ComponentType } from '../types';

/**
 * Component types for which simulation may set `state === 'tripped'`.
 * Keep in sync with series protection handling in `simulation/engine.ts`.
 */
export const SERIES_PROTECTION_TRIP_TYPES = new Set<ComponentType>([
  'mcb',
  'hrc_fuse',
  'control_circuit_fuse',
  'earth_leakage_relay_cbct',
  'rcd',
  'residual_current_circuit_breaker',
  'overload_relay',
  'three_phase_mcb',
  'mccb',
  'motor_protection_circuit_breaker',
  'four_phase_mcb',
  'motorized_mccb',
  'four_pole_motorized_mccb',
  'air_circuit_breaker',
]);

export function isSeriesProtectionTripType(type: ComponentType): boolean {
  return SERIES_PROTECTION_TRIP_TYPES.has(type);
}
