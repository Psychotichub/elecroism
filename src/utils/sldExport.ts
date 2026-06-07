import { jsPDF } from 'jspdf';
import type Konva from 'konva';
import type { Circuit } from '../types';
import type { ElectroProject } from '../types/project';
import { captureStageRegion } from './export';
import {
  buildTitleBlock,
  drawPdfTitleBlock,
  drawingAreaHeight,
  resolveDrawingSheets,
  safeDrawingFileBase,
  type ResolvedDrawingSheet,
} from './drawingExport';
import {
  computeDrawingContentBounds,
  normalizeBounds,
} from './drawingBounds';
import { applyExportLayerVisibility } from './drawingLayerStage';

const PAGE_W = 297;
const MARGIN = 10;
const DRAW_TOP = MARGIN;
const DRAW_W = PAGE_W - MARGIN * 2;

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

function loadImageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load SLD image'));
    img.src = dataUrl;
  });
}

function sldSheetMeta(sheet: ResolvedDrawingSheet): ResolvedDrawingSheet {
  return {
    ...sheet,
    title: sheet.title ? `SLD — ${sheet.title}` : 'Single-line diagram',
    reference: sheet.reference || '=SLD',
  };
}

export async function buildSldPdf(
  stage: Konva.Stage,
  circuit: Circuit,
  project?: Pick<ElectroProject, 'name' | 'titleBlock'> | null
): Promise<jsPDF> {
  const meta = buildTitleBlock(circuit, project);
  const drawH = drawingAreaHeight(meta);
  const sheets = resolveDrawingSheets(circuit).map(sldSheetMeta);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const fallback = normalizeBounds(
    computeDrawingContentBounds(circuit) ?? {
      minX: -200,
      minY: -150,
      maxX: 200,
      maxY: 150,
    }
  );

  for (let i = 0; i < sheets.length; i++) {
    if (i > 0) doc.addPage();
    const sheet = sheets[i];
    const restoreLayers = applyExportLayerVisibility(stage);
    let dataUrl: string;
    try {
      dataUrl = captureStageRegion(
        stage,
        sheet.bounds ?? fallback,
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

export async function downloadSldPdf(
  stage: Konva.Stage,
  circuit: Circuit,
  baseFileName?: string,
  project?: Pick<ElectroProject, 'name' | 'titleBlock'> | null
): Promise<void> {
  const doc = await buildSldPdf(stage, circuit, project);
  const base = safeDrawingFileBase(baseFileName ?? circuit.name);
  doc.save(`${base}-sld.pdf`);
}

export async function waitForCanvasRepaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}
