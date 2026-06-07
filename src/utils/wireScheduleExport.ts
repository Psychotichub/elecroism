import type { Circuit, CircuitComponent, Wire } from '../types';
import { effectiveWireDisplayText } from './wireLabelLayout';
import { buildDcWireExportFields } from './dcWireLabeling';

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function terminalLabel(
  circuit: Circuit,
  componentId: string,
  pointId: string
): string {
  const c = circuit.components.find((x) => x.id === componentId);
  const p = c?.connectionPoints.find((x) => x.id === pointId);
  return (p?.label ?? '').trim();
}

function componentRef(c: CircuitComponent | undefined): string {
  if (!c) return '';
  const lab = (c.label ?? '').trim();
  return lab ? `${c.type} (${lab})` : c.type;
}

export type WireScheduleRow = {
  wireNumber: string;
  wireLabel: string;
  displayLabel: string;
  fromType: string;
  fromComponent: string;
  fromTerminal: string;
  toType: string;
  toComponent: string;
  toTerminal: string;
  color: string;
  wireCategory: string;
  styleLayer: string;
  crossSection: string;
  sourceTag: string;
  destinationTag: string;
  vertexCount: string;
  dcPolarity: string;
  exportColorLabel: string;
  dcColorOk: string;
};

export function buildWireScheduleRows(circuit: Circuit): WireScheduleRow[] {
  return circuit.wires.map((w: Wire) => {
    const fromC = circuit.components.find((c) => c.id === w.fromComponentId);
    const toC = circuit.components.find((c) => c.id === w.toComponentId);
    const fromL = terminalLabel(circuit, w.fromComponentId, w.fromPointId);
    const toL = terminalLabel(circuit, w.toComponentId, w.toPointId);
    const dcFields = buildDcWireExportFields(w, fromL, toL);
    return {
      wireNumber: String(w.wireNumber ?? ''),
      wireLabel: String(w.wireLabel ?? ''),
      displayLabel: effectiveWireDisplayText(w),
      fromType: fromC?.type ?? '',
      fromComponent: componentRef(fromC),
      fromTerminal: fromL,
      toType: toC?.type ?? '',
      toComponent: componentRef(toC),
      toTerminal: toL,
      color: w.color,
      wireCategory: w.wireCategory ?? '',
      styleLayer: w.styleLayer ?? '',
      crossSection: String(w.crossSection ?? ''),
      sourceTag: String(w.sourceTag ?? ''),
      destinationTag: String(w.destinationTag ?? ''),
      vertexCount: String(Math.max(0, w.points.length / 2)),
      dcPolarity: dcFields.dcPolarity,
      exportColorLabel: dcFields.exportColorLabel,
      dcColorOk: dcFields.dcColorOk,
    };
  });
}

const WIRE_SCHEDULE_HEADER: (keyof WireScheduleRow)[] = [
  'wireNumber',
  'wireLabel',
  'displayLabel',
  'fromType',
  'fromComponent',
  'fromTerminal',
  'toType',
  'toComponent',
  'toTerminal',
  'color',
  'wireCategory',
  'styleLayer',
  'crossSection',
  'sourceTag',
  'destinationTag',
  'vertexCount',
  'dcPolarity',
  'exportColorLabel',
  'dcColorOk',
];

export function wireScheduleToCsv(circuit: Circuit): string {
  const rows = buildWireScheduleRows(circuit);
  const lines = [
    WIRE_SCHEDULE_HEADER.join(','),
    ...rows.map((r) =>
      WIRE_SCHEDULE_HEADER.map((k) => csvEscape(r[k])).join(',')
    ),
  ];
  return lines.join('\r\n');
}

export function downloadWireScheduleCsv(circuit: Circuit, baseFileName: string) {
  const csv = wireScheduleToCsv(circuit);
  const safe = baseFileName.replace(/[^\w-]+/g, '_').slice(0, 80) || 'circuit';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safe}-wires.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
