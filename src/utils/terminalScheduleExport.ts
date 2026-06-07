import type { Circuit, CircuitComponent } from '../types';
import { effectiveWireDisplayText } from './wireLabelLayout';

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function componentRef(c: CircuitComponent | undefined): string {
  if (!c) return '';
  const lab = (c.label ?? '').trim();
  return lab ? `${c.type} (${lab})` : c.type;
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

export type TerminalScheduleRow = {
  device: string;
  deviceLabel: string;
  terminal: string;
  direction: string;
  wireNumber: string;
  wireLabel: string;
  remoteDevice: string;
  remoteTerminal: string;
  color: string;
  crossSection: string;
};

export function buildTerminalScheduleRows(circuit: Circuit): TerminalScheduleRow[] {
  const rows: TerminalScheduleRow[] = [];

  for (const w of circuit.wires) {
    const fromC = circuit.components.find((c) => c.id === w.fromComponentId);
    const toC = circuit.components.find((c) => c.id === w.toComponentId);
    const display = effectiveWireDisplayText(w);

    rows.push({
      device: fromC?.type ?? '',
      deviceLabel: (fromC?.label ?? '').trim(),
      terminal: terminalLabel(circuit, w.fromComponentId, w.fromPointId),
      direction: 'out',
      wireNumber: String(w.wireNumber ?? ''),
      wireLabel: display,
      remoteDevice: componentRef(toC),
      remoteTerminal: terminalLabel(circuit, w.toComponentId, w.toPointId),
      color: w.color,
      crossSection: String(w.crossSection ?? ''),
    });

    rows.push({
      device: toC?.type ?? '',
      deviceLabel: (toC?.label ?? '').trim(),
      terminal: terminalLabel(circuit, w.toComponentId, w.toPointId),
      direction: 'in',
      wireNumber: String(w.wireNumber ?? ''),
      wireLabel: display,
      remoteDevice: componentRef(fromC),
      remoteTerminal: terminalLabel(circuit, w.fromComponentId, w.fromPointId),
      color: w.color,
      crossSection: String(w.crossSection ?? ''),
    });
  }

  return rows.sort(
    (a, b) =>
      a.deviceLabel.localeCompare(b.deviceLabel) ||
      a.terminal.localeCompare(b.terminal) ||
      a.wireNumber.localeCompare(b.wireNumber)
  );
}

const TERMINAL_SCHEDULE_HEADER: (keyof TerminalScheduleRow)[] = [
  'device',
  'deviceLabel',
  'terminal',
  'direction',
  'wireNumber',
  'wireLabel',
  'remoteDevice',
  'remoteTerminal',
  'color',
  'crossSection',
];

export function terminalScheduleToCsv(circuit: Circuit): string {
  const rows = buildTerminalScheduleRows(circuit);
  const lines = [
    TERMINAL_SCHEDULE_HEADER.join(','),
    ...rows.map((r) =>
      TERMINAL_SCHEDULE_HEADER.map((k) => csvEscape(r[k])).join(',')
    ),
  ];
  return lines.join('\r\n');
}

export function downloadTerminalScheduleCsv(circuit: Circuit, baseFileName: string) {
  const csv = terminalScheduleToCsv(circuit);
  const safe = baseFileName.replace(/[^\w-]+/g, '_').slice(0, 80) || 'circuit';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safe}-terminals.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
