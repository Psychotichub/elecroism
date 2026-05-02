import type { ComponentType, PhaseSystem, WireColor } from '../../../types';

export const WIRE_COLORS: { value: WireColor; label: string }[] = [
  { value: 'brown', label: 'Brown (L)' },
  { value: 'blue', label: 'Blue (N)' },
  { value: 'green_yellow', label: 'Green-Yellow (PE)' },
  { value: 'black', label: 'Black' },
  { value: 'grey', label: 'Grey' },
  { value: 'red', label: 'Red' },
];

/**
 * Standard nominal cross-sections (mm²): small flexible control Cu (e.g. H07V-K) through feeders to 240.
 */
export const CROSS_SECTIONS = [
  0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240,
] as const;

export function defaultPhaseSystemForType(t: ComponentType): PhaseSystem {
  switch (t) {
    case 'dc_power_source':
    case 'ac_dc_converter':
      return 'single_phase';
    case 'three_phase_source':
    case 'three_phase_motor':
    case 'three_phase_mcb':
    case 'four_phase_mcb':
    case 'air_circuit_breaker':
    case 'motorized_mccb':
    case 'four_pole_motorized_mccb':
    case 'three_phase_contactor':
    case 'four_phase_contactor':
      return 'three_phase';
    default:
      return 'single_phase';
  }
}
