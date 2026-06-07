import type { SymbolLegendRow } from './symbolLegend';
import {
  LEGEND_BODY_SM_LINE_MM,
  LEGEND_BODY_SM_PT,
  LEGEND_CAPTION_PT,
  LEGEND_TITLE_PT,
} from '../design/legendTypography';

const LEGEND_PAGE_MARGIN = 14;
const LEGEND_COL_REF = LEGEND_PAGE_MARGIN;
const LEGEND_COL_SYMBOL = LEGEND_PAGE_MARGIN + 10;
const LEGEND_COL_QTY = LEGEND_PAGE_MARGIN + 72;
const LEGEND_COL_TAGS = LEGEND_PAGE_MARGIN + 82;
const LEGEND_ROW_HEIGHT = LEGEND_BODY_SM_LINE_MM;

/** jsPDF surface used by legend rendering. */
export type SymbolLegendPdfDocument = {
  setFont: (fontName: string, fontStyle: string) => void;
  setFontSize: (size: number) => void;
  text: (text: string | string[], x: number, y: number) => void;
  setDrawColor: (color: number) => void;
  setLineWidth: (width: number) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  addPage: () => void;
  splitTextToSize: (text: string, maxWidth: number) => string[];
};

/** Renders a symbol legend page using typography aligned with `es-typo-body-sm`. */
export function drawSymbolLegendPdf(
  doc: SymbolLegendPdfDocument,
  rows: SymbolLegendRow[],
  drawingName: string,
  pageW = 297,
  pageH = 210
): void {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(LEGEND_TITLE_PT);
  doc.text(`Symbol legend — ${drawingName}`, LEGEND_PAGE_MARGIN, 22);

  doc.setFontSize(LEGEND_BODY_SM_PT);
  doc.setFont('helvetica', 'bold');
  const headerY = 32;
  doc.text('#', LEGEND_COL_REF, headerY);
  doc.text('Symbol', LEGEND_COL_SYMBOL, headerY);
  doc.text('Qty', LEGEND_COL_QTY, headerY);
  doc.text('Tags', LEGEND_COL_TAGS, headerY);
  doc.setDrawColor(120);
  doc.setLineWidth(0.2);
  doc.line(
    LEGEND_PAGE_MARGIN,
    headerY + 2,
    pageW - LEGEND_PAGE_MARGIN,
    headerY + 2
  );

  doc.setFont('helvetica', 'normal');
  let y = headerY + LEGEND_ROW_HEIGHT + 2;

  if (rows.length === 0) {
    doc.setFontSize(LEGEND_CAPTION_PT);
    doc.text('(No symbols on this sheet)', LEGEND_COL_SYMBOL, y);
    return;
  }

  for (const row of rows) {
    if (y > pageH - LEGEND_PAGE_MARGIN - LEGEND_ROW_HEIGHT * 2) {
      doc.addPage();
      y = LEGEND_PAGE_MARGIN + LEGEND_ROW_HEIGHT;
      doc.setFontSize(LEGEND_BODY_SM_PT);
    }

    doc.setFontSize(LEGEND_BODY_SM_PT);
    doc.setFont('helvetica', 'bold');
    doc.text(String(row.ref), LEGEND_COL_REF, y);
    doc.text(row.displayName.slice(0, 36), LEGEND_COL_SYMBOL, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(row.quantity), LEGEND_COL_QTY, y);
    doc.text(row.tags.slice(0, 48) || '—', LEGEND_COL_TAGS, y);

    if (row.description) {
      doc.setFontSize(LEGEND_CAPTION_PT);
      const descLines = doc.splitTextToSize(
        row.description,
        pageW - LEGEND_COL_SYMBOL - LEGEND_PAGE_MARGIN
      );
      doc.text(descLines, LEGEND_COL_SYMBOL, y + 3.2);
      y += LEGEND_ROW_HEIGHT + (descLines.length - 1) * 3;
    }

    y += LEGEND_ROW_HEIGHT + 1.5;
  }
}
