import { jsPDF } from 'jspdf';
import type { Circuit, SimulationResult } from '../types';
import {
  buildProtectionCoordinationReport,
  type ProtectionCoordinationRow,
} from './circuitDesignValidation';
import { buildFaultLevelReport } from './faultLevelAnalysis';
import { validateBreakingCapacity } from './shortCircuitValidation';
import {
  buildSheetIndexRows,
  buildTitleBlock,
  drawPdfSheetIndexPage,
  drawPdfTitleBlock,
  resolveDrawingSheets,
  safeDrawingFileBase,
  type DrawingTitleBlock,
  type ResolvedDrawingSheet,
  type SheetIndexRow,
} from './drawingExport';
import { buildTccChartData, renderTccChartPngDataUrl } from './tccChart';

const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = 10;
const TITLE_H = 28;
const CONTENT_TOP = MARGIN + 4;
const CONTENT_BOTTOM = PAGE_H - TITLE_H - MARGIN;

export type CoordinationDeviceRow = {
  componentId: string;
  label: string;
  deviceType: string;
  ratedAmps: number | null;
  tripOrFamily: string | null;
  minHopsFromLive: number | null;
  operatingCurrentA: number | null;
  prospectiveFaultA: number | null;
  breakingCapacityA: number | null;
  faultMarginPct: number | null;
};

export type CoordinationStudyData = {
  title: DrawingTitleBlock;
  drawingSheetIndex: SheetIndexRow[];
  devices: CoordinationDeviceRow[];
  marginNotes: string[];
  generatedAt: string;
  hasTccCurves: boolean;
};

function deviceRowFromCoordination(
  row: ProtectionCoordinationRow,
  circuit: Circuit,
  simulationResult: SimulationResult | null,
  faultById: Map<string, number>
): CoordinationDeviceRow {
  const comp = circuit.components.find((c) => c.id === row.componentId);
  const icu = comp?.properties.breakingCapacity ?? null;
  const isc = faultById.get(row.componentId) ?? null;
  let margin: number | null = null;
  if (icu != null && isc != null && icu > 0) {
    margin = Math.round(((icu - isc) / icu) * 1000) / 10;
  }
  const op = simulationResult?.nodes[row.componentId]?.currentA ?? null;
  return {
    componentId: row.componentId,
    label: row.label,
    deviceType: row.deviceType.replace(/_/g, ' '),
    ratedAmps: row.ratedAmps,
    tripOrFamily: row.tripOrFamily,
    minHopsFromLive: row.minHopsFromLive,
    operatingCurrentA: op != null && op > 0 ? Math.round(op * 100) / 100 : null,
    prospectiveFaultA: isc != null ? Math.round(isc) : null,
    breakingCapacityA: icu,
    faultMarginPct: margin,
  };
}

export function buildCoordinationStudyData(
  circuit: Circuit,
  simulationResult: SimulationResult | null
): CoordinationStudyData {
  const coordination = buildProtectionCoordinationReport(circuit);
  const faultRows = buildFaultLevelReport(circuit, simulationResult);
  const faultById = new Map(faultRows.map((r) => [r.deviceId, r.faultCurrentA]));

  const devices = coordination.rows.map((row) =>
    deviceRowFromCoordination(row, circuit, simulationResult, faultById)
  );

  const marginNotes: string[] = [];
  for (const iss of coordination.issues) {
    marginNotes.push(iss.message);
  }
  for (const iss of validateBreakingCapacity(circuit, simulationResult)) {
    marginNotes.push(iss.message);
  }

  const { curves } = buildTccChartData(circuit, simulationResult);
  const drawingSheets = resolveDrawingSheets(circuit);

  return {
    title: buildTitleBlock(circuit),
    drawingSheetIndex: buildSheetIndexRows(drawingSheets),
    devices,
    marginNotes,
    generatedAt: new Date().toISOString(),
    hasTccCurves: curves.length > 0,
  };
}

function reportSheet(
  sheetNumber: number,
  title: string
): ResolvedDrawingSheet {
  return {
    sheetNumber,
    title,
    reference: 'COORD',
    bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
  };
}

function drawDevicesTable(doc: jsPDF, devices: CoordinationDeviceRow[]): void {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Protection device settings & fault levels', MARGIN, CONTENT_TOP + 8);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  const y0 = CONTENT_TOP + 16;
  const cols = [
    { x: MARGIN, w: 42, label: 'Device' },
    { x: MARGIN + 42, w: 22, label: 'Type' },
    { x: MARGIN + 64, w: 14, label: 'In (A)' },
    { x: MARGIN + 78, w: 18, label: 'Trip' },
    { x: MARGIN + 96, w: 12, label: 'Hops' },
    { x: MARGIN + 108, w: 16, label: 'Iop (A)' },
    { x: MARGIN + 124, w: 20, label: 'Isc (A)' },
    { x: MARGIN + 144, w: 18, label: 'Icu (A)' },
    { x: MARGIN + 162, w: 18, label: 'Margin %' },
  ];
  for (const c of cols) {
    doc.text(c.label, c.x, y0);
  }
  doc.line(MARGIN, y0 + 1.5, PAGE_W - MARGIN, y0 + 1.5);

  doc.setFont('helvetica', 'normal');
  let y = y0 + 7;
  for (const d of devices) {
    if (y > CONTENT_BOTTOM - 4) {
      doc.addPage();
      y = CONTENT_TOP + 8;
    }
    doc.text(d.label.slice(0, 24), cols[0].x, y);
    doc.text(d.deviceType.slice(0, 14), cols[1].x, y);
    doc.text(d.ratedAmps != null ? String(d.ratedAmps) : '—', cols[2].x, y);
    doc.text((d.tripOrFamily ?? '—').slice(0, 10), cols[3].x, y);
    doc.text(
      d.minHopsFromLive != null ? String(d.minHopsFromLive) : '—',
      cols[4].x,
      y
    );
    doc.text(
      d.operatingCurrentA != null ? d.operatingCurrentA.toFixed(1) : '—',
      cols[5].x,
      y
    );
    doc.text(
      d.prospectiveFaultA != null ? String(d.prospectiveFaultA) : '—',
      cols[6].x,
      y
    );
    doc.text(
      d.breakingCapacityA != null ? String(d.breakingCapacityA) : '—',
      cols[7].x,
      y
    );
    const margin =
      d.faultMarginPct != null
        ? d.faultMarginPct < 0
          ? `${d.faultMarginPct.toFixed(0)}`
          : `${d.faultMarginPct.toFixed(0)}`
        : '—';
    doc.text(margin, cols[8].x, y);
    y += 6;
  }
}

function drawMarginNotes(doc: jsPDF, notes: string[]): void {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Coordination & fault margin notes', MARGIN, CONTENT_TOP + 8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  let y = CONTENT_TOP + 18;
  if (notes.length === 0) {
    doc.text('No coordination or breaking-capacity warnings for this circuit.', MARGIN, y);
    return;
  }
  for (const note of notes) {
    const lines = doc.splitTextToSize(note, PAGE_W - MARGIN * 2) as string[];
    for (const line of lines) {
      if (y > CONTENT_BOTTOM - 2) {
        doc.addPage();
        y = CONTENT_TOP + 8;
      }
      doc.text(line, MARGIN, y);
      y += 4.5;
    }
    y += 2;
  }
}

export function buildCoordinationStudyPdf(
  circuit: Circuit,
  simulationResult: SimulationResult | null
): jsPDF {
  const data = buildCoordinationStudyData(circuit, simulationResult);
  const drawingSheets = resolveDrawingSheets(circuit);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  let pageCount = 2 + (data.hasTccCurves ? 1 : 0) + (data.marginNotes.length > 0 ? 1 : 0);
  if (drawingSheets.length > 1) pageCount += 1;

  let pageNum = 1;

  if (drawingSheets.length > 1) {
    drawPdfSheetIndexPage(doc, data.title, data.drawingSheetIndex);
    doc.addPage();
    pageNum++;
  }

  drawDevicesTable(doc, data.devices);
  drawPdfTitleBlock(
    doc,
    data.title,
    reportSheet(pageNum, 'Coordination study — devices'),
    pageCount
  );
  pageNum++;

  if (data.hasTccCurves) {
    doc.addPage();
    const { curves, operatingCurrents } = buildTccChartData(circuit, simulationResult);
    const png = renderTccChartPngDataUrl(curves, operatingCurrents);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Time-current curves (TCC)', MARGIN, CONTENT_TOP + 8);
    if (png) {
      const imgW = PAGE_W - MARGIN * 2;
      const imgH = CONTENT_BOTTOM - CONTENT_TOP - 12;
      doc.addImage(png, 'PNG', MARGIN, CONTENT_TOP + 12, imgW, imgH);
    }
    drawPdfTitleBlock(
      doc,
      data.title,
      reportSheet(pageNum, 'Coordination study — TCC'),
      pageCount
    );
    pageNum++;
  }

  if (data.marginNotes.length > 0) {
    doc.addPage();
    drawMarginNotes(doc, data.marginNotes);
    drawPdfTitleBlock(
      doc,
      data.title,
      reportSheet(pageNum, 'Coordination study — notes'),
      pageCount
    );
  }

  return doc;
}

export function downloadCoordinationStudyPdf(
  circuit: Circuit,
  simulationResult: SimulationResult | null,
  baseFileName?: string
): void {
  const data = buildCoordinationStudyData(circuit, simulationResult);
  if (data.devices.length === 0) {
    throw new Error(
      'No protection devices found — add MCBs, MCCBs, fuses, or ACBs before exporting a coordination study.'
    );
  }
  const doc = buildCoordinationStudyPdf(circuit, simulationResult);
  const base = safeDrawingFileBase(baseFileName ?? circuit.name);
  doc.save(`${base}-coordination-study.pdf`);
}
