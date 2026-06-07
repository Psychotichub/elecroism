import { jsPDF } from 'jspdf';
import type Konva from 'konva';
import type { Circuit, DrawingSheet } from '../types';
import {
  boundsForComponents,
  computeDrawingContentBounds,
  normalizeBounds,
  type WorldBounds,
} from './drawingBounds';
import { captureStageRegion } from './export';

export type DrawingTitleBlock = {
  project: string;
  drawingNumber: string;
  revision: string;
  drawnBy: string;
  checkedBy: string;
  date: string;
  circuitName: string;
};

export type ResolvedDrawingSheet = {
  sheetNumber: number;
  title: string;
  reference: string;
  bounds: WorldBounds;
};

export type SheetIndexRow = {
  sheetNumber: number;
  title: string;
  reference: string;
};

const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = 10;
const TITLE_H = 28;
const DRAW_TOP = MARGIN;
const DRAW_H = PAGE_H - MARGIN - TITLE_H - MARGIN;
const DRAW_W = PAGE_W - MARGIN * 2;

export function buildTitleBlock(circuit: Circuit): DrawingTitleBlock {
  const date = new Date(circuit.updatedAt || circuit.createdAt || Date.now());
  return {
    project: circuit.drawingProject?.trim() || circuit.name || 'Untitled',
    drawingNumber:
      circuit.drawingNumber?.trim() || circuit.name || 'DRG-001',
    revision: circuit.drawingRevision?.trim() || 'A',
    drawnBy: circuit.drawnBy?.trim() || '—',
    checkedBy: circuit.checkedBy?.trim() || '—',
    date: date.toLocaleDateString(),
    circuitName: circuit.name || 'Circuit',
  };
}

function resolveSheetBounds(
  circuit: Circuit,
  sheet: DrawingSheet,
  fallback: WorldBounds
): WorldBounds {
  if (
    sheet.minX != null &&
    sheet.minY != null &&
    sheet.maxX != null &&
    sheet.maxY != null
  ) {
    return normalizeBounds({
      minX: sheet.minX,
      minY: sheet.minY,
      maxX: sheet.maxX,
      maxY: sheet.maxY,
    });
  }
  if (sheet.componentIds && sheet.componentIds.length > 0) {
    const fromComps = boundsForComponents(circuit, sheet.componentIds);
    if (fromComps) return normalizeBounds(fromComps);
  }
  return fallback;
}

export function resolveDrawingSheets(circuit: Circuit): ResolvedDrawingSheet[] {
  const full = computeDrawingContentBounds(circuit);
  const fallback = normalizeBounds(
    full ?? { minX: -200, minY: -150, maxX: 200, maxY: 150 }
  );

  const defs =
    circuit.drawingSheets && circuit.drawingSheets.length > 0
      ? [...circuit.drawingSheets].sort(
          (a, b) => a.sheetNumber - b.sheetNumber
        )
      : [
          {
            id: 'default',
            sheetNumber: 1,
            title: circuit.name || 'Schematic',
            reference: circuit.drawingNumber?.trim() || '=S1',
          } satisfies DrawingSheet,
        ];

  return defs.map((sheet) => ({
    sheetNumber: sheet.sheetNumber,
    title: sheet.title || `Sheet ${sheet.sheetNumber}`,
    reference: sheet.reference || `=S${sheet.sheetNumber}`,
    bounds: resolveSheetBounds(circuit, sheet, fallback),
  }));
}

export function buildSheetIndexRows(
  sheets: ResolvedDrawingSheet[]
): SheetIndexRow[] {
  return sheets.map((s) => ({
    sheetNumber: s.sheetNumber,
    title: s.title,
    reference: s.reference,
  }));
}

function fitImageRect(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number
): { w: number; h: number; x: number; y: number } {
  if (imgW <= 0 || imgH <= 0) {
    return { w: boxW, h: boxH, x: MARGIN, y: DRAW_TOP };
  }
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return {
    w,
    h,
    x: MARGIN + (boxW - w) * 0.5,
    y: DRAW_TOP + (boxH - h) * 0.5,
  };
}

function drawTitleBlock(
  doc: jsPDF,
  meta: DrawingTitleBlock,
  sheet: ResolvedDrawingSheet,
  sheetCount: number
): void {
  const y0 = PAGE_H - TITLE_H;
  doc.setDrawColor(40);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, y0, DRAW_W, TITLE_H);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ElectroSim', MARGIN + 2, y0 + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const col1 = MARGIN + 2;
  const col2 = MARGIN + 72;
  const col3 = MARGIN + 142;
  const row1 = y0 + 12;
  const row2 = y0 + 19;
  const row3 = y0 + 26;

  doc.text(`Project: ${meta.project}`, col1, row1);
  doc.text(`Drawing: ${meta.drawingNumber}`, col2, row1);
  doc.text(`Rev: ${meta.revision}`, col3, row1);

  doc.text(`Sheet: ${sheet.sheetNumber} of ${sheetCount}`, col1, row2);
  doc.text(`Title: ${sheet.title}`, col2, row2);
  doc.text(`Ref: ${sheet.reference}`, col3, row2);

  doc.text(`Drawn: ${meta.drawnBy}`, col1, row3);
  doc.text(`Checked: ${meta.checkedBy}`, col2, row3);
  doc.text(`Date: ${meta.date}`, col3, row3);
}

function drawSheetIndexPage(
  doc: jsPDF,
  meta: DrawingTitleBlock,
  rows: SheetIndexRow[]
): void {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Sheet Index', MARGIN, 24);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const yStart = 36;
  doc.text('Sheet', MARGIN, yStart);
  doc.text('Title', MARGIN + 18, yStart);
  doc.text('Reference', MARGIN + 110, yStart);
  doc.line(MARGIN, yStart + 2, PAGE_W - MARGIN, yStart + 2);

  doc.setFont('helvetica', 'normal');
  rows.forEach((row, i) => {
    const y = yStart + 8 + i * 7;
    doc.text(String(row.sheetNumber), MARGIN, y);
    doc.text(row.title.slice(0, 48), MARGIN + 18, y);
    doc.text(row.reference.slice(0, 32), MARGIN + 110, y);
  });

  const indexSheet: ResolvedDrawingSheet = {
    sheetNumber: 0,
    title: 'Sheet Index',
    reference: meta.drawingNumber,
    bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
  };
  drawTitleBlock(doc, meta, indexSheet, rows.length);
}

function loadImageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load schematic image'));
    img.src = dataUrl;
  });
}

export async function buildDrawingPdf(
  stage: Konva.Stage,
  circuit: Circuit
): Promise<jsPDF> {
  const meta = buildTitleBlock(circuit);
  const sheets = resolveDrawingSheets(circuit);
  const indexRows = buildSheetIndexRows(sheets);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  if (sheets.length > 1) {
    drawSheetIndexPage(doc, meta, indexRows);
    doc.addPage();
  }

  for (let i = 0; i < sheets.length; i++) {
    if (i > 0 || sheets.length > 1) {
      if (i > 0) doc.addPage();
    }

    const sheet = sheets[i];
    const dataUrl = captureStageRegion(
      stage,
      sheet.bounds,
      circuit.zoom,
      circuit.panX,
      circuit.panY,
      2
    );
    const { w: imgW, h: imgH } = await loadImageSize(dataUrl);
    const fit = fitImageRect(imgW, imgH, DRAW_W, DRAW_H);
    doc.addImage(dataUrl, 'PNG', fit.x, fit.y, fit.w, fit.h);
    drawTitleBlock(doc, meta, sheet, sheets.length);
  }

  return doc;
}

export function safeDrawingFileBase(name: string): string {
  return (name || 'circuit').replace(/[^\w-]+/g, '_').slice(0, 80);
}

export async function downloadDrawingPdf(
  stage: Konva.Stage,
  circuit: Circuit,
  baseFileName?: string
): Promise<void> {
  const doc = await buildDrawingPdf(stage, circuit);
  const base = safeDrawingFileBase(baseFileName ?? circuit.name);
  doc.save(`${base}-drawing.pdf`);
}
