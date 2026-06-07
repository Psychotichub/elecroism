import { jsPDF } from 'jspdf';
import type Konva from 'konva';
import type { Circuit, DrawingSheet } from '../types';
import type { ElectroProject, RevisionHistoryEntry } from '../types/project';
import {
  boundsForComponents,
  computeDrawingContentBounds,
  normalizeBounds,
  type WorldBounds,
} from './drawingBounds';
import { captureStageRegion } from './export';
import { applyExportLayerVisibility } from './drawingLayerStage';
import { resolvedProjectTitleBlock } from './projectTitleBlock';

export type DrawingTitleBlock = {
  brandLabel: string;
  logoUrl?: string;
  project: string;
  drawingNumber: string;
  revision: string;
  drawnBy: string;
  checkedBy: string;
  approvedBy: string;
  scale: string;
  date: string;
  circuitName: string;
  revisionHistory: RevisionHistoryEntry[];
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
const BASE_TITLE_H = 28;
const DRAW_TOP = MARGIN;
const DRAW_W = PAGE_W - MARGIN * 2;

const MAX_REV_HISTORY_ROWS = 4;

export function titleBlockHeight(meta: DrawingTitleBlock): number {
  const rows = Math.min(meta.revisionHistory.length, MAX_REV_HISTORY_ROWS);
  return BASE_TITLE_H + (rows > 0 ? 6 + rows * 4 : 0);
}

export function drawingAreaHeight(meta: DrawingTitleBlock): number {
  return PAGE_H - MARGIN - titleBlockHeight(meta) - MARGIN;
}

export function buildTitleBlock(
  circuit: Circuit,
  project?: Pick<ElectroProject, 'name' | 'titleBlock'> | null
): DrawingTitleBlock {
  const resolved = project
    ? resolvedProjectTitleBlock(project as ElectroProject, circuit)
    : {
        brandName: circuit.drawingProject?.trim() || circuit.name || 'ElectroSim',
        client: circuit.drawingProject?.trim() || circuit.name || 'Untitled',
        drawingNumber:
          circuit.drawingNumber?.trim() || circuit.name || 'DRG-001',
        revision: circuit.drawingRevision?.trim() || 'A',
        scale: circuit.drawingScale?.trim() || 'NTS',
        drawnBy: circuit.drawnBy?.trim() || '—',
        checkedBy: circuit.checkedBy?.trim() || '—',
        approvedBy: circuit.approvedBy?.trim() || '—',
        revisionHistory: circuit.revisionHistory ?? [],
      };
  const date = new Date(circuit.updatedAt || circuit.createdAt || Date.now());
  return {
    brandLabel:
      resolved.brandName?.trim() ||
      resolved.client?.trim() ||
      'ElectroSim',
    logoUrl: resolved.logoUrl,
    project: resolved.client ?? 'Untitled',
    drawingNumber: resolved.drawingNumber ?? 'DRG-001',
    revision: resolved.revision ?? 'A',
    drawnBy: resolved.drawnBy ?? '—',
    checkedBy: resolved.checkedBy ?? '—',
    approvedBy: resolved.approvedBy ?? '—',
    scale: resolved.scale ?? 'NTS',
    date: date.toLocaleDateString(),
    circuitName: circuit.name || 'Circuit',
    revisionHistory: resolved.revisionHistory ?? [],
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

function drawRevisionHistoryTable(
  doc: jsPDF,
  meta: DrawingTitleBlock,
  y0: number
): void {
  const rows = meta.revisionHistory.slice(-MAX_REV_HISTORY_ROWS);
  if (rows.length === 0) return;

  const tableY = y0 + BASE_TITLE_H + 2;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('Rev', MARGIN + 2, tableY);
  doc.text('Date', MARGIN + 14, tableY);
  doc.text('Description', MARGIN + 38, tableY);
  doc.line(MARGIN + 2, tableY + 1, PAGE_W - MARGIN - 2, tableY + 1);

  doc.setFont('helvetica', 'normal');
  rows.forEach((row, i) => {
    const y = tableY + 4 + i * 4;
    doc.text(row.revision.slice(0, 6), MARGIN + 2, y);
    doc.text(row.date.slice(0, 10), MARGIN + 14, y);
    doc.text(row.description.slice(0, 72), MARGIN + 38, y);
  });

  doc.setDrawColor(40);
  doc.line(MARGIN, y0 + BASE_TITLE_H, MARGIN + DRAW_W, y0 + BASE_TITLE_H);
}

export function drawPdfTitleBlock(
  doc: jsPDF,
  meta: DrawingTitleBlock,
  sheet: ResolvedDrawingSheet,
  sheetCount: number
): void {
  const blockH = titleBlockHeight(meta);
  const y0 = PAGE_H - blockH;
  doc.setDrawColor(40);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, y0, DRAW_W, blockH);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(meta.brandLabel.slice(0, 42), MARGIN + 2, y0 + 6);

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

  doc.text(`Scale: ${meta.scale}`, col1, row3);
  doc.text(`Drawn: ${meta.drawnBy}`, col2, row3);
  doc.text(`Checked: ${meta.checkedBy}`, col3, row3);

  if (meta.approvedBy && meta.approvedBy !== '—') {
    doc.setFontSize(7);
    doc.text(`Approved: ${meta.approvedBy}`, col1, y0 + blockH - 2);
    doc.text(`Date: ${meta.date}`, col3, y0 + blockH - 2);
    doc.setFontSize(8);
  } else {
    doc.text(`Date: ${meta.date}`, col3, row3);
  }

  drawRevisionHistoryTable(doc, meta, y0);
}

export function drawPdfSheetIndexPage(
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
  drawPdfTitleBlock(doc, meta, indexSheet, rows.length);
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
  circuit: Circuit,
  project?: Pick<ElectroProject, 'name' | 'titleBlock'> | null
): Promise<jsPDF> {
  const meta = buildTitleBlock(circuit, project);
  const drawH = drawingAreaHeight(meta);
  const sheets = resolveDrawingSheets(circuit);
  const indexRows = buildSheetIndexRows(sheets);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  if (sheets.length > 1) {
    drawPdfSheetIndexPage(doc, meta, indexRows);
    doc.addPage();
  }

  for (let i = 0; i < sheets.length; i++) {
    if (i > 0 || sheets.length > 1) {
      if (i > 0) doc.addPage();
    }

    const sheet = sheets[i];
    const restoreLayers = applyExportLayerVisibility(stage);
    let dataUrl: string;
    try {
      dataUrl = captureStageRegion(
        stage,
        sheet.bounds,
        circuit.zoom,
        circuit.panX,
        circuit.panY,
        2
      );
    } finally {
      restoreLayers();
    }
    const { w: imgW, h: imgH } = await loadImageSize(dataUrl);
    const fit = fitImageRect(imgW, imgH, DRAW_W, drawH);
    doc.addImage(dataUrl, 'PNG', fit.x, fit.y, fit.w, fit.h);
    drawPdfTitleBlock(doc, meta, sheet, sheets.length);
  }

  return doc;
}

export function safeDrawingFileBase(name: string): string {
  return (name || 'circuit').replace(/[^\w-]+/g, '_').slice(0, 80);
}

export async function downloadDrawingPdf(
  stage: Konva.Stage,
  circuit: Circuit,
  baseFileName?: string,
  project?: Pick<ElectroProject, 'name' | 'titleBlock'> | null
): Promise<void> {
  const doc = await buildDrawingPdf(stage, circuit, project);
  const base = safeDrawingFileBase(baseFileName ?? circuit.name);
  doc.save(`${base}-drawing.pdf`);
}
