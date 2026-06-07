import type { Circuit, ComponentType } from '../types';
import { getComponentPanelDescription } from './componentPanelInfo';

/** Schematic-only nodes omitted from the published symbol legend. */
const LEGEND_SKIP_TYPES = new Set<ComponentType>(['connection_point']);

export type SymbolLegendRow = {
  ref: number;
  type: ComponentType;
  displayName: string;
  quantity: number;
  tags: string;
  description: string;
};

function displayNameForType(type: ComponentType): string {
  const info = getComponentPanelDescription(type);
  if (info) return info.displayName;
  return type.replace(/_/g, ' ');
}

function descriptionForType(type: ComponentType): string {
  return getComponentPanelDescription(type)?.description ?? '';
}

export function buildSymbolLegend(circuit: Circuit): SymbolLegendRow[] {
  const groups = new Map<
    ComponentType,
    { labels: string[]; count: number }
  >();

  for (const c of circuit.components) {
    if (LEGEND_SKIP_TYPES.has(c.type)) continue;
    const existing = groups.get(c.type);
    const label = (c.label ?? '').trim();
    if (existing) {
      existing.count += 1;
      if (label) existing.labels.push(label);
    } else {
      groups.set(c.type, {
        count: 1,
        labels: label ? [label] : [],
      });
    }
  }

  const sorted = [...groups.entries()].sort((a, b) =>
    displayNameForType(a[0]).localeCompare(displayNameForType(b[0]))
  );

  return sorted.map(([type, g], index) => ({
    ref: index + 1,
    type,
    displayName: displayNameForType(type),
    quantity: g.count,
    tags: [...new Set(g.labels)].sort().join(', '),
    description: descriptionForType(type),
  }));
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

const LEGEND_HEADER: (keyof SymbolLegendRow)[] = [
  'ref',
  'displayName',
  'quantity',
  'tags',
  'description',
];

export function symbolLegendToCsv(rows: SymbolLegendRow[]): string {
  const lines = [
    LEGEND_HEADER.join(','),
    ...rows.map((r) =>
      LEGEND_HEADER.map((k) => csvEscape(String(r[k]))).join(',')
    ),
  ];
  return lines.join('\r\n');
}

export function symbolLegendToText(
  rows: SymbolLegendRow[],
  drawingName: string
): string {
  const header = `Symbol legend — ${drawingName}`;
  const rule = '─'.repeat(Math.min(60, header.length));
  const body = rows
    .map(
      (r) =>
        `${r.ref}. ${r.displayName} (×${r.quantity})${r.tags ? ` — ${r.tags}` : ''}\n   ${r.description}`
    )
    .join('\n\n');
  return `${header}\n${rule}\n\n${body || '(No symbols on this sheet)'}\n`;
}

export function downloadSymbolLegendCsv(
  circuit: Circuit,
  baseFileName: string
) {
  const rows = buildSymbolLegend(circuit);
  const csv = symbolLegendToCsv(rows);
  const safe = baseFileName.replace(/[^\w-]+/g, '_').slice(0, 80) || 'drawing';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safe}-symbol-legend.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
