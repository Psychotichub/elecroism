import type {
  Circuit,
  CircuitComponent,
  ComponentType,
  SimulationResult,
} from '../types';
import { analyzeConnectionIntegrity } from './connectionIntegrity';
import type { CircuitValidationIssue } from './circuitDesignValidation';

export type DrawingSearchResultKind =
  | 'component'
  | 'wire'
  | 'action';

export type DrawingSearchResult = {
  id: string;
  kind: DrawingSearchResultKind;
  title: string;
  subtitle: string;
  score: number;
  componentIds: string[];
  wireId?: string;
};

export type DrawingQuickAction = {
  id: string;
  title: string;
  subtitle: string;
  keywords: string;
};

export const DRAWING_QUICK_ACTIONS: DrawingQuickAction[] = [
  {
    id: 'select-unwired',
    title: 'Select unwired terminals',
    subtitle: 'Components with open connection points',
    keywords: 'unwired terminal open integrity',
  },
  {
    id: 'select-faulted',
    title: 'Select faulted devices',
    subtitle: 'Simulation faults, tripped, validation errors',
    keywords: 'fault faulted trip error validation',
  },
  {
    id: 'selectall-mcb',
    title: 'Select all MCBs',
    subtitle: 'Single- and three-phase breakers',
    keywords: 'selectall mcb breaker',
  },
  {
    id: 'selectall-motor',
    title: 'Select all motors',
    subtitle: '1φ and 3φ motor loads',
    keywords: 'selectall motor load',
  },
  {
    id: 'selectall-contactor',
    title: 'Select all contactors',
    subtitle: 'KM / contactor symbols',
    keywords: 'selectall contactor km',
  },
];

const MCB_TYPES = new Set<ComponentType>([
  'mcb',
  'three_phase_mcb',
  'four_phase_mcb',
  'mccb',
  'motor_protection_circuit_breaker',
  'motorized_mccb',
  'four_pole_motorized_mccb',
]);

const MOTOR_TYPES = new Set<ComponentType>(['motor', 'three_phase_motor']);

const CONTACTOR_TYPES = new Set<ComponentType>([
  'contactor',
  'three_phase_contactor',
  'four_phase_contactor',
]);

/** Fuzzy score — higher is a better match. */
export function fuzzyScore(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  const t = text.trim().toLowerCase();
  if (!q) return 0;
  if (!t) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 85;
  if (t.includes(q)) return 70;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  if (qi === q.length) return 45;
  return 0;
}

function typeLabel(type: ComponentType): string {
  return type.replace(/_/g, ' ');
}

export function searchDrawing(
  circuit: Circuit,
  query: string,
  limit = 12
): DrawingSearchResult[] {
  const q = query.trim();
  if (!q) return [];

  const results: DrawingSearchResult[] = [];

  for (const comp of circuit.components) {
    const fields = [
      comp.label,
      typeLabel(comp.type),
      comp.properties.designatorFunction ?? '',
    ];
    for (const cp of comp.connectionPoints) {
      fields.push(cp.label);
    }
    const best = Math.max(...fields.map((f) => fuzzyScore(q, f)));
    if (best > 0) {
      results.push({
        id: `comp-${comp.id}`,
        kind: 'component',
        title: comp.label || typeLabel(comp.type),
        subtitle: typeLabel(comp.type),
        score: best,
        componentIds: [comp.id],
      });
    }
  }

  for (const wire of circuit.wires) {
    const fields = [
      wire.wireNumber ?? '',
      wire.wireLabel ?? '',
      wire.color,
      String(wire.crossSection),
    ];
    const best = Math.max(...fields.map((f) => fuzzyScore(q, f)));
    if (best > 0) {
      results.push({
        id: `wire-${wire.id}`,
        kind: 'wire',
        title: wire.wireLabel?.trim() || wire.wireNumber || 'Wire',
        subtitle: `${wire.color} · ${wire.crossSection} mm²`,
        score: best - 5,
        componentIds: [],
        wireId: wire.id,
      });
    }
  }

  for (const action of DRAWING_QUICK_ACTIONS) {
    const best = fuzzyScore(q, `${action.title} ${action.keywords}`);
    if (best > 0) {
      results.push({
        id: `action-${action.id}`,
        kind: 'action',
        title: action.title,
        subtitle: action.subtitle,
        score: best - 8,
        componentIds: [],
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function componentIdsOfType(
  circuit: Circuit,
  types: Set<ComponentType>
): string[] {
  return circuit.components.filter((c) => types.has(c.type)).map((c) => c.id);
}

export function selectAllOfTypeQuery(
  circuit: Circuit,
  typeQuery: string
): string[] {
  const q = typeQuery.trim().toLowerCase();
  if (q === 'mcb' || q === 'breaker' || q === 'breakers') {
    return componentIdsOfType(circuit, MCB_TYPES);
  }
  if (q === 'motor' || q === 'motors') {
    return componentIdsOfType(circuit, MOTOR_TYPES);
  }
  if (q === 'contactor' || q === 'contactors' || q === 'km') {
    return componentIdsOfType(circuit, CONTACTOR_TYPES);
  }
  const token = q.replace(/\s+/g, '_');
  return circuit.components
    .filter((c) => {
      const t = c.type.toLowerCase();
      const human = typeLabel(c.type).toLowerCase();
      return (
        t === token ||
        t.includes(token) ||
        human.includes(q.replace(/_/g, ' '))
      );
    })
    .map((c) => c.id);
}

export function componentIdsWithUnwiredTerminals(circuit: Circuit): string[] {
  const summary = analyzeConnectionIntegrity(circuit);
  const ids = new Set<string>();
  for (const issue of summary.issues) {
    if (issue.kind === 'unwired_terminal') {
      ids.add(issue.componentId);
    }
  }
  return [...ids];
}

export function componentIdsFaulted(
  circuit: Circuit,
  simulationResult: SimulationResult | null,
  validationIssues: CircuitValidationIssue[]
): string[] {
  const ids = new Set<string>();
  for (const f of simulationResult?.faults ?? []) {
    if (f.affectedComponentId) ids.add(f.affectedComponentId);
  }
  for (const c of circuit.components) {
    if (c.state === 'tripped') ids.add(c.id);
  }
  for (const iss of validationIssues) {
    if (iss.severity === 'error' || iss.severity === 'warning') {
      for (const cid of iss.componentIds) ids.add(cid);
    }
  }
  return [...ids];
}

export function viewportForComponents(
  circuit: Circuit,
  componentIds: string[]
): { zoom: number; panX: number; panY: number } | null {
  const comps = circuit.components.filter((c) => componentIds.includes(c.id));
  if (comps.length === 0) return null;

  const xs = comps.map((c: CircuitComponent) => c.x);
  const ys = comps.map((c: CircuitComponent) => c.y);
  const minX = Math.min(...xs) - 80;
  const maxX = Math.max(...xs) + 80;
  const minY = Math.min(...ys) - 80;
  const maxY = Math.max(...ys) + 80;
  const worldW = Math.max(120, maxX - minX);
  const worldH = Math.max(120, maxY - minY);
  const viewportW = window.innerWidth * 0.55;
  const viewportH = window.innerHeight * 0.65;
  const fitZoom = Math.max(
    0.35,
    Math.min(2.5, Math.min(viewportW / worldW, viewportH / worldH))
  );
  const panX = viewportW * 0.5 - ((minX + maxX) * 0.5) * fitZoom;
  const panY = viewportH * 0.5 - ((minY + maxY) * 0.5) * fitZoom;
  return { zoom: fitZoom, panX, panY };
}
