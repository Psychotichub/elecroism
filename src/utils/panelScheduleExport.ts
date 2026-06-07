import { jsPDF } from 'jspdf';
import type { Circuit, CircuitComponent, ComponentType } from '../types';
import type { ElectroProject } from '../types/project';
import {
  buildTitleBlock,
  drawPdfTitleBlock,
  safeDrawingFileBase,
  type ResolvedDrawingSheet,
} from './drawingExport';
import { effectiveWireDisplayText } from './wireLabelLayout';

const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = 10;
const TITLE_H = 28;
const CONTENT_TOP = MARGIN + 4;
const CONTENT_BOTTOM = PAGE_H - TITLE_H - MARGIN;

const PANEL_LINEUP_TYPES = new Set<ComponentType>([
  'mcb',
  'three_phase_mcb',
  'four_phase_mcb',
  'mccb',
  'motorized_mccb',
  'four_pole_motorized_mccb',
  'motor_protection_circuit_breaker',
  'air_circuit_breaker',
  'hrc_fuse',
  'control_circuit_fuse',
  'rcd',
  'residual_current_circuit_breaker',
  'earth_leakage_relay_cbct',
  'contactor',
  'three_phase_contactor',
  'four_phase_contactor',
  'overload_relay',
  'energy_meter',
  'digital_multifunction_meter',
  'control_transformer',
]);

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function humanizeType(type: string): string {
  return type.replace(/_/g, ' ');
}

export function isPanelLineupDevice(type: ComponentType): boolean {
  return PANEL_LINEUP_TYPES.has(type);
}

function panelRating(c: CircuitComponent): string {
  const p = c.properties;
  const parts: string[] = [];
  if (p.ratingAmps != null) parts.push(`${p.ratingAmps} A`);
  if (p.tripCurve) parts.push(`curve ${p.tripCurve}`);
  if (p.poles != null) parts.push(`${p.poles}P`);
  if (p.hrcType) parts.push(p.hrcType);
  if (p.hrcBreakingCapacityKa != null) parts.push(`${p.hrcBreakingCapacityKa} kA`);
  if (p.breakingCapacity != null) parts.push(`Icu ${p.breakingCapacity} A`);
  if (p.rcdSensitivity != null) parts.push(`${p.rcdSensitivity} mA`);
  if (p.mpcbTripClass) parts.push(`class ${p.mpcbTripClass}`);
  if (p.overloadTripClass) parts.push(`OL class ${p.overloadTripClass}`);
  if (p.lineVoltage != null) parts.push(`${p.lineVoltage} V`);
  if (p.phaseSystem) parts.push(String(p.phaseSystem).replace(/_/g, ' '));
  return parts.join('; ') || '—';
}

function panelNotes(c: CircuitComponent): string {
  const p = c.properties;
  const parts: string[] = [];
  if (p.acbBmsDoCloseTag) parts.push(`BMS close ${p.acbBmsDoCloseTag}`);
  if (p.acbBmsDoOpenTag) parts.push(`BMS open ${p.acbBmsDoOpenTag}`);
  if (p.meterProtocol && p.meterProtocol !== 'none') {
    parts.push(p.meterProtocol.replace(/_/g, ' '));
  }
  if (p.meterCommAddress != null) parts.push(`addr ${p.meterCommAddress}`);
  if (p.crossSheetRef?.trim()) parts.push(`→ ${p.crossSheetRef.trim()}`);
  if (p.auxContactFollowContactorId) parts.push('aux follows coil');
  if (c.state === 'off' || c.state === 'tripped') parts.push(`state: ${c.state}`);
  return parts.join('; ') || '—';
}

function cableRefsForComponent(circuit: Circuit, componentId: string): string {
  const refs = new Set<string>();
  for (const w of circuit.wires) {
    if (w.fromComponentId !== componentId && w.toComponentId !== componentId) {
      continue;
    }
    const display = effectiveWireDisplayText(w);
    if (display) {
      refs.add(display);
      continue;
    }
    if (w.sourceTag?.trim()) refs.add(w.sourceTag.trim());
    else if (w.destinationTag?.trim()) refs.add(w.destinationTag.trim());
    else if (w.crossSection > 0) refs.add(`${w.crossSection} mm²`);
  }
  const sorted = [...refs].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return sorted.join(', ') || '—';
}

export type PanelScheduleRow = {
  position: string;
  tag: string;
  type: string;
  rating: string;
  cableRef: string;
  notes: string;
};

export function buildPanelScheduleRows(circuit: Circuit): PanelScheduleRow[] {
  const devices = circuit.components
    .filter((c) => isPanelLineupDevice(c.type))
    .sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      if (a.y !== b.y) return a.y - b.y;
      return a.label.localeCompare(b.label, undefined, { numeric: true });
    });

  return devices.map((c, index) => ({
    position: String(index + 1),
    tag: c.label.trim() || c.id.slice(0, 8),
    type: humanizeType(c.type),
    rating: panelRating(c),
    cableRef: cableRefsForComponent(circuit, c.id),
    notes: panelNotes(c),
  }));
}

const PANEL_HEADER: (keyof PanelScheduleRow)[] = [
  'position',
  'tag',
  'type',
  'rating',
  'cableRef',
  'notes',
];

const PANEL_HEADER_LABELS: Record<keyof PanelScheduleRow, string> = {
  position: 'Pos',
  tag: 'Tag',
  type: 'Type',
  rating: 'Rating',
  cableRef: 'Cable ref',
  notes: 'Notes',
};

export function panelScheduleToCsv(circuit: Circuit): string {
  const rows = buildPanelScheduleRows(circuit);
  const lines = [
    PANEL_HEADER.map((k) => PANEL_HEADER_LABELS[k]).join(','),
    ...rows.map((r) => PANEL_HEADER.map((k) => csvEscape(r[k])).join(',')),
  ];
  return lines.join('\r\n');
}

function reportSheet(pageNum: number, title: string): ResolvedDrawingSheet {
  return {
    sheetNumber: pageNum,
    title,
    reference: 'Panel schedule',
    bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
  };
}

function drawPanelScheduleTable(doc: jsPDF, rows: PanelScheduleRow[]): void {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Panel / MCC lineup schedule', MARGIN, CONTENT_TOP + 8);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  const y0 = CONTENT_TOP + 16;
  const cols = [
    { x: MARGIN, w: 10, label: 'Pos' },
    { x: MARGIN + 10, w: 28, label: 'Tag' },
    { x: MARGIN + 38, w: 36, label: 'Type' },
    { x: MARGIN + 74, w: 42, label: 'Rating' },
    { x: MARGIN + 116, w: 48, label: 'Cable ref' },
    { x: MARGIN + 164, w: 40, label: 'Notes' },
  ];
  for (const c of cols) {
    doc.text(c.label, c.x, y0);
  }
  doc.line(MARGIN, y0 + 1.5, PAGE_W - MARGIN, y0 + 1.5);

  doc.setFont('helvetica', 'normal');
  let y = y0 + 7;
  for (const row of rows) {
    if (y > CONTENT_BOTTOM - 4) {
      doc.addPage();
      y = CONTENT_TOP + 8;
    }
    doc.text(row.position, cols[0].x, y);
    doc.text(row.tag.slice(0, 18), cols[1].x, y);
    doc.text(row.type.slice(0, 22), cols[2].x, y);
    doc.text(row.rating.slice(0, 28), cols[3].x, y);
    doc.text(row.cableRef.slice(0, 32), cols[4].x, y);
    const noteLines = doc.splitTextToSize(row.notes, cols[5].w) as string[];
    doc.text(noteLines[0] ?? '—', cols[5].x, y);
    y += noteLines.length > 1 ? 6 + (noteLines.length - 1) * 4 : 6;
  }

  if (rows.length === 0) {
    doc.setFontSize(9);
    doc.text(
      'No panel lineup devices placed — add MCBs, MCCBs, contactors, fuses, or meters.',
      MARGIN,
      y0 + 10
    );
  }
}

export function buildPanelSchedulePdf(
  circuit: Circuit,
  project?: Pick<ElectroProject, 'name' | 'titleBlock'> | null
): jsPDF {
  const meta = buildTitleBlock(circuit, project);
  const rows = buildPanelScheduleRows(circuit);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  drawPanelScheduleTable(doc, rows);
  drawPdfTitleBlock(doc, meta, reportSheet(1, 'Panel / MCC schedule'), 1);

  return doc;
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadPanelScheduleCsv(
  circuit: Circuit,
  baseFileName: string
): void {
  const csv = panelScheduleToCsv(circuit);
  const safe = safeDrawingFileBase(baseFileName);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  triggerBlobDownload(blob, `${safe}-panel-schedule.csv`);
}

export function downloadPanelSchedulePdf(
  circuit: Circuit,
  project?: Pick<ElectroProject, 'name' | 'titleBlock'> | null,
  baseFileName?: string
): void {
  const doc = buildPanelSchedulePdf(circuit, project);
  const safe = safeDrawingFileBase(baseFileName ?? circuit.name);
  doc.save(`${safe}-panel-schedule.pdf`);
}
