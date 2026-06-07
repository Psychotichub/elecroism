import type { Circuit } from '../types';
import {
  DRAWING_QUICK_ACTIONS,
  searchDrawing,
  type DrawingSearchResult,
  type DrawingSearchResultKind,
} from './drawingSearch';

export type PaletteSection = {
  id: string;
  label: string;
  items: DrawingSearchResult[];
};

const KIND_LABEL: Record<DrawingSearchResultKind, string> = {
  action: 'Actions',
  component: 'Components',
  wire: 'Wires',
};

export function quickActionResults(): DrawingSearchResult[] {
  return DRAWING_QUICK_ACTIONS.map((a) => ({
    id: `action-${a.id}`,
    kind: 'action' as const,
    title: a.title,
    subtitle: a.subtitle,
    score: 100,
    componentIds: [],
  }));
}

function typeLabel(type: string): string {
  return type.replace(/_/g, ' ');
}

export function resolveRecentPaletteItems(
  ids: string[],
  circuit: Circuit
): DrawingSearchResult[] {
  const quickByActionId = new Map(
    DRAWING_QUICK_ACTIONS.map((a) => [`action-${a.id}`, a])
  );
  const out: DrawingSearchResult[] = [];

  for (const id of ids) {
    if (id.startsWith('action-')) {
      const action = quickByActionId.get(id);
      if (action) {
        out.push({
          id,
          kind: 'action',
          title: action.title,
          subtitle: action.subtitle,
          score: 100,
          componentIds: [],
        });
      }
      continue;
    }
    if (id.startsWith('comp-')) {
      const compId = id.slice('comp-'.length);
      const comp = circuit.components.find((c) => c.id === compId);
      if (comp) {
        out.push({
          id,
          kind: 'component',
          title: comp.label || typeLabel(comp.type),
          subtitle: typeLabel(comp.type),
          score: 100,
          componentIds: [comp.id],
        });
      }
      continue;
    }
    if (id.startsWith('wire-')) {
      const wireId = id.slice('wire-'.length);
      const wire = circuit.wires.find((w) => w.id === wireId);
      if (wire) {
        out.push({
          id,
          kind: 'wire',
          title: wire.wireLabel?.trim() || wire.wireNumber || 'Wire',
          subtitle: `${wire.color} · ${wire.crossSection} mm²`,
          score: 100,
          componentIds: [],
          wireId: wire.id,
        });
      }
    }
  }

  return out;
}

export function buildPaletteSections(
  circuit: Circuit,
  query: string,
  recentIds: string[]
): PaletteSection[] {
  const q = query.trim();

  if (!q) {
    const sections: PaletteSection[] = [];
    const recent = resolveRecentPaletteItems(recentIds, circuit);
    if (recent.length > 0) {
      sections.push({ id: 'recent', label: 'Recent', items: recent });
    }
    const recentIdsSet = new Set(recent.map((r) => r.id));
    const quick = quickActionResults().filter((item) => !recentIdsSet.has(item.id));
    sections.push({ id: 'quick-actions', label: 'Quick actions', items: quick });
    return sections;
  }

  const hits = searchDrawing(circuit, q, 14);
  const grouped = new Map<DrawingSearchResultKind, DrawingSearchResult[]>();
  for (const hit of hits) {
    const list = grouped.get(hit.kind) ?? [];
    list.push(hit);
    grouped.set(hit.kind, list);
  }

  const order: DrawingSearchResultKind[] = ['action', 'component', 'wire'];
  return order
    .filter((kind) => (grouped.get(kind)?.length ?? 0) > 0)
    .map((kind) => ({
      id: kind,
      label: KIND_LABEL[kind],
      items: grouped.get(kind)!,
    }));
}

export function flattenPaletteSections(
  sections: PaletteSection[]
): DrawingSearchResult[] {
  return sections.flatMap((section) => section.items);
}
