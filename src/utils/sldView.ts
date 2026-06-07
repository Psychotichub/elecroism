import type { CircuitComponent, ComponentType, Wire } from '../types';
import { resolveComponentDrawingLayer } from './drawingLayers';

/** Documentation-only items omitted from single-line diagrams. */
export const SLD_SKIP_TYPES = new Set<ComponentType>([
  'din_rail',
  'mounting_plate',
  'cable_duct',
  'ferrule_cable_markers',
  'control_wiring',
  'power_cables',
  'busbar_support_insulator',
]);

export type SldBlockStyle = {
  kind: 'block' | 'busbar' | 'dot';
  width: number;
  height: number;
  fill: string;
  stroke: string;
  abbr: string;
};

const TYPE_ABBR: Partial<Record<ComponentType, string>> = {
  power_source: 'SRC',
  three_phase_source: '3φ',
  dc_power_source: 'DC',
  mcb: 'MCB',
  three_phase_mcb: '3P',
  four_phase_mcb: '4P',
  mccb: 'MCCB',
  motorized_mccb: 'mMCCB',
  air_circuit_breaker: 'ACB',
  hrc_fuse: 'FUSE',
  rcd: 'RCD',
  contactor: 'K',
  three_phase_contactor: '3K',
  three_phase_motor: 'M',
  motor: 'M',
  busbar: 'BUS',
  busbar_system: 'BUS',
  transformer: 'T',
  control_transformer: 'T',
  energy_meter: 'EM',
  generic_load: 'LOAD',
  lamp: 'H',
};

export function sldTypeAbbreviation(type: ComponentType): string {
  return TYPE_ABBR[type] ?? type.replace(/_/g, ' ').slice(0, 6).toUpperCase();
}

export function sldBlockStyle(comp: CircuitComponent): SldBlockStyle {
  const layer = resolveComponentDrawingLayer(comp);
  const stroke =
    layer === 'power'
      ? '#DC2626'
      : layer === 'control'
        ? '#2563EB'
        : '#7C3AED';
  const fill =
    layer === 'power'
      ? 'rgba(220,38,38,0.15)'
      : layer === 'control'
        ? 'rgba(37,99,235,0.15)'
        : 'rgba(124,58,237,0.15)';

  if (comp.type === 'busbar' || comp.type === 'busbar_system') {
    return {
      kind: 'busbar',
      width: 48,
      height: 6,
      fill: '#1E293B',
      stroke: '#0F172A',
      abbr: 'BUS',
    };
  }

  if (comp.type === 'junction' || comp.type === 'connection_point') {
    return {
      kind: 'dot',
      width: 6,
      height: 6,
      fill: stroke,
      stroke,
      abbr: '',
    };
  }

  return {
    kind: 'block',
    width: 28,
    height: 20,
    fill,
    stroke,
    abbr: sldTypeAbbreviation(comp.type),
  };
}

export function shouldRenderSldComponent(comp: CircuitComponent): boolean {
  return !SLD_SKIP_TYPES.has(comp.type);
}

/** Collapse wire polyline to a single straight segment (endpoints only). */
export function sldWireSegment(wire: Wire): number[] {
  const pts = wire.points;
  if (pts.length < 4) return pts;
  return [pts[0], pts[1], pts[pts.length - 2], pts[pts.length - 1]];
}
