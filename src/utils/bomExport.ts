import type { Circuit, CircuitComponent } from '../types';

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function humanizeType(type: string): string {
  return type.replace(/_/g, ' ');
}

function ratingSummary(c: CircuitComponent): string {
  const p = c.properties;
  const parts: string[] = [];
  if (p.ratingAmps != null) parts.push(`${p.ratingAmps} A`);
  if (p.breakingCapacity != null) parts.push(`${p.breakingCapacity} A break`);
  if (p.hrcBreakingCapacityKa != null) parts.push(`${p.hrcBreakingCapacityKa} kA`);
  if (p.powerWatts != null) parts.push(`${p.powerWatts} W`);
  if (p.voltage != null) parts.push(`${p.voltage} V`);
  if (p.lineVoltage != null) parts.push(`${p.lineVoltage} V LL`);
  if (p.poles != null) parts.push(`${p.poles}P`);
  if (p.phaseSystem) parts.push(String(p.phaseSystem).replace(/_/g, ' '));
  return parts.join('; ') || '—';
}

function bomGroupKey(c: CircuitComponent): string {
  const label = (c.label ?? '').trim();
  const prefix = label.replace(/\d+$/, '').trim();
  return [c.type, prefix, ratingSummary(c)].join('|');
}

export type BomRow = {
  type: string;
  designatorPrefix: string;
  count: string;
  ratings: string;
  exampleLabels: string;
  manufacturer: string;
  partNumber: string;
};

export function buildBomRows(circuit: Circuit): BomRow[] {
  const groups = new Map<
    string,
    {
      type: string;
      prefix: string;
      ratings: string;
      labels: string[];
      count: number;
    }
  >();

  for (const c of circuit.components) {
    const key = bomGroupKey(c);
    const label = (c.label ?? '').trim();
    const prefix = label.replace(/\d+$/, '').trim() || humanizeType(c.type);
    const existing = groups.get(key);
    if (existing) {
      if (label) existing.labels.push(label);
      existing.count += 1;
    } else {
      groups.set(key, {
        type: humanizeType(c.type),
        prefix,
        ratings: ratingSummary(c),
        labels: label ? [label] : [],
        count: 1,
      });
    }
  }

  return [...groups.values()]
    .map((g) => ({
      type: g.type,
      designatorPrefix: g.prefix,
      count: String(g.count),
      ratings: g.ratings,
      exampleLabels: g.labels.slice(0, 5).join(', '),
      manufacturer: '',
      partNumber: '',
    }))
    .sort((a, b) => a.type.localeCompare(b.type) || a.designatorPrefix.localeCompare(b.designatorPrefix));
}

const BOM_HEADER: (keyof BomRow)[] = [
  'type',
  'designatorPrefix',
  'count',
  'ratings',
  'exampleLabels',
  'manufacturer',
  'partNumber',
];

export function bomToCsv(circuit: Circuit): string {
  const rows = buildBomRows(circuit);
  const lines = [
    BOM_HEADER.join(','),
    ...rows.map((r) => BOM_HEADER.map((k) => csvEscape(r[k])).join(',')),
  ];
  return lines.join('\r\n');
}

export function downloadBomCsv(circuit: Circuit, baseFileName: string) {
  const csv = bomToCsv(circuit);
  const safe = baseFileName.replace(/[^\w-]+/g, '_').slice(0, 80) || 'circuit';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safe}-bom.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
