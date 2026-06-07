import type {
  Circuit,
  CircuitComponent,
  ComponentType,
  DesignatorScheme,
} from '../types';

export type SpatialRenumberOrder = 'row' | 'column';

export type ParsedDesignator = {
  location: string;
  function: string;
  number: number | null;
  suffix: string;
};

const SKIP_RENUMBER_TYPES = new Set<ComponentType>([
  'junction',
  'connection_point',
  'busbar',
  'busbar_system',
  'neutral_bar_system',
  'earth_bar_grounding_system',
  'din_rail',
  'mounting_plate',
  'cable_duct',
  'busbar_support_insulator',
  'control_wiring',
  'power_cables',
  'ferrule_cable_markers',
]);

const FUNCTION_BY_TYPE: Partial<Record<ComponentType, string>> = {
  mcb: 'Q',
  three_phase_mcb: 'Q',
  four_phase_mcb: 'Q',
  mccb: 'Q',
  motorized_mccb: 'Q',
  four_pole_motorized_mccb: 'Q',
  motor_protection_circuit_breaker: 'Q',
  air_circuit_breaker: 'Q',
  hrc_fuse: 'F',
  control_circuit_fuse: 'F',
  rcd: 'Q',
  residual_current_circuit_breaker: 'Q',
  earth_leakage_relay_cbct: 'Q',
  contactor: 'K',
  three_phase_contactor: 'K',
  four_phase_contactor: 'K',
  relay: 'K',
  interposing_relay: 'K',
  smart_relay: 'K',
  motor: 'M',
  three_phase_motor: 'M',
  overload_relay: 'F',
  lamp: 'H',
  indicator_lamp: 'H',
  phase_indicator_bank: 'H',
  heater: 'E',
  panel_heater: 'E',
  cooling_fan: 'E',
  generic_load: 'E',
  socket: 'X',
  power_source: 'G',
  three_phase_source: 'G',
  dc_power_source: 'G',
  ac_dc_converter: 'U',
  smps: 'G',
  control_transformer: 'T',
  estop: 'S',
  push_button: 'S',
  switch: 'S',
  two_way_switch: 'S',
  selector_switch: 'S',
  door_interlock: 'S',
  timer: 'T',
  energy_meter: 'B',
  digital_multifunction_meter: 'B',
  multimeter: 'B',
  power_quality_analyzer: 'B',
  terminal_block: 'X',
};

export function isRenumberableComponent(comp: CircuitComponent): boolean {
  return !SKIP_RENUMBER_TYPES.has(comp.type);
}

export function circuitDesignatorScheme(circuit: Circuit): DesignatorScheme {
  return circuit.designatorScheme ?? 'simple';
}

export function circuitDesignatorLocation(circuit: Circuit): string {
  return (circuit.designatorLocation ?? '').trim();
}

export function defaultFunctionLetter(type: ComponentType): string {
  return FUNCTION_BY_TYPE[type] ?? type.charAt(0).toUpperCase();
}

export function functionLetterForComponent(
  circuit: Circuit,
  comp: CircuitComponent
): string {
  const override = comp.properties.designatorFunction?.trim();
  if (override) return override.toUpperCase();
  const parsed = parseDesignatorLabel(comp.label, circuitDesignatorScheme(circuit));
  if (parsed.function) return parsed.function.toUpperCase();
  return defaultFunctionLetter(comp.type);
}

/** Parse simple (`Q1 - Pump`) or IEC (`=MCC1+Q1`) device tags. */
export function parseDesignatorLabel(
  label: string,
  scheme: DesignatorScheme = 'simple'
): ParsedDesignator {
  const trimmed = label.trim();
  const iec = trimmed.match(/^=([^+]*)\+([A-Za-z][A-Za-z0-9]*?)(\d+)(.*)$/);
  if (iec) {
    return {
      location: iec[1].trim(),
      function: iec[2].toUpperCase(),
      number: Number(iec[3]),
      suffix: iec[4],
    };
  }
  const simple = trimmed.match(/^([A-Za-z][A-Za-z0-9]*?)(\d+)(.*)$/);
  if (simple) {
    return {
      location: '',
      function: simple[1].toUpperCase(),
      number: Number(simple[2]),
      suffix: simple[3],
    };
  }
  if (scheme === 'iec81346' && trimmed.startsWith('=')) {
    const loose = trimmed.match(/^=([^+]*)\+(.+)$/);
    if (loose) {
      return {
        location: loose[1].trim(),
        function: loose[2].trim(),
        number: null,
        suffix: '',
      };
    }
  }
  return { location: '', function: '', number: null, suffix: '' };
}

export function formatDesignatorLabel(
  scheme: DesignatorScheme,
  location: string,
  fn: string,
  number: number,
  suffix = ''
): string {
  const f = fn.toUpperCase();
  const core =
    scheme === 'iec81346'
      ? `=${location.trim()}+${f}${number}`
      : `${f}${number}`;
  return suffix ? `${core}${suffix}` : core;
}

export function buildComponentDesignator(
  circuit: Circuit,
  comp: CircuitComponent,
  number: number
): string {
  const scheme = circuitDesignatorScheme(circuit);
  const location = circuitDesignatorLocation(circuit);
  const fn = functionLetterForComponent(circuit, comp);
  const suffix = parseDesignatorLabel(comp.label, scheme).suffix;
  return formatDesignatorLabel(scheme, location, fn, number, suffix);
}

export function sortComponentsSpatial(
  components: CircuitComponent[],
  order: SpatialRenumberOrder,
  gridSize: number
): CircuitComponent[] {
  const rowKey = (c: CircuitComponent) =>
    Math.round(c.y / Math.max(1, gridSize));
  const colKey = (c: CircuitComponent) =>
    Math.round(c.x / Math.max(1, gridSize));
  return [...components].sort((a, b) => {
    if (order === 'row') {
      const dy = rowKey(a) - rowKey(b);
      if (dy !== 0) return dy;
      return a.x - b.x;
    }
    const dx = colKey(a) - colKey(b);
    if (dx !== 0) return dx;
    return a.y - b.y;
  });
}

export function bulkRenumberDesignators(
  circuit: Circuit,
  order: SpatialRenumberOrder,
  targetIds?: Set<string>
): Circuit {
  const targets = circuit.components.filter((c) => {
    if (!isRenumberableComponent(c)) return false;
    if (targetIds && targetIds.size > 0) return targetIds.has(c.id);
    return true;
  });
  if (targets.length === 0) return circuit;

  const sorted = sortComponentsSpatial(targets, order, circuit.gridSize);
  const counters = new Map<string, number>();
  const labelById = new Map<string, string>();

  for (const comp of sorted) {
    const fn = functionLetterForComponent(circuit, comp);
    const next = (counters.get(fn) ?? 0) + 1;
    counters.set(fn, next);
    labelById.set(comp.id, buildComponentDesignator(circuit, comp, next));
  }

  return {
    ...circuit,
    components: circuit.components.map((c) => {
      const label = labelById.get(c.id);
      return label ? { ...c, label } : c;
    }),
    updatedAt: new Date().toISOString(),
  };
}

export function applyDesignatorSchemeToCircuit(circuit: Circuit): Circuit {
  const scheme = circuitDesignatorScheme(circuit);
  const location = circuitDesignatorLocation(circuit);
  const components = circuit.components.map((c) => {
    if (!isRenumberableComponent(c)) return c;
    const parsed = parseDesignatorLabel(c.label, 'simple');
    const fn = functionLetterForComponent(circuit, c);
    const num = parsed.number ?? 1;
    const suffix = parsed.suffix;
    const label = formatDesignatorLabel(scheme, location, fn, num, suffix);
    return { ...c, label };
  });
  return { ...circuit, components, updatedAt: new Date().toISOString() };
}

export type DuplicateDesignatorGroup = {
  normalized: string;
  display: string;
  componentIds: string[];
};

export function findDuplicateDesignators(
  circuit: Circuit
): DuplicateDesignatorGroup[] {
  const byKey = new Map<string, { display: string; ids: string[] }>();
  for (const c of circuit.components) {
    const raw = c.label.trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    const entry = byKey.get(key);
    if (entry) {
      entry.ids.push(c.id);
    } else {
      byKey.set(key, { display: raw, ids: [c.id] });
    }
  }
  return [...byKey.entries()]
    .filter(([, v]) => v.ids.length > 1)
    .map(([normalized, v]) => ({
      normalized,
      display: v.display,
      componentIds: v.ids,
    }));
}
