import { jsPDF } from 'jspdf';
import type { Circuit, ReviewCommentMessage, ReviewCommentStatus } from '../types';
import type { ElectroProject } from '../types/project';
import {
  buildTitleBlock,
  drawPdfTitleBlock,
  safeDrawingFileBase,
  type ResolvedDrawingSheet,
} from './drawingExport';
import {
  formatReviewAnchorLabel,
  resolveReviewAnchor,
  sortReviewThreads,
  threadPreviewText,
} from './reviewComments';

const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = 10;

function reportSheet(title: string): ResolvedDrawingSheet {
  return {
    sheetNumber: 1,
    title,
    reference: 'REVIEW',
    bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
  };
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export type ReviewCommentsJsonThread = {
  id: string;
  status: ReviewCommentStatus;
  anchorType: 'component' | 'point';
  componentId?: string;
  anchorLabel: string;
  worldX: number;
  worldY: number;
  createdAt: string;
  updatedAt: string;
  author?: string;
  messages: ReviewCommentMessage[];
};

export type ReviewCommentsDocument = {
  version: '1.0';
  projectName: string;
  sheetName: string;
  exportedAt: string;
  openCount: number;
  resolvedCount: number;
  threads: ReviewCommentsJsonThread[];
};

function buildReviewCommentsJsonThreads(
  circuit: Circuit
): ReviewCommentsJsonThread[] {
  return sortReviewThreads(circuit.reviewComments ?? []).map((thread) => {
    const anchor = resolveReviewAnchor(circuit, thread);
    return {
      id: thread.id,
      status: thread.status,
      anchorType: thread.anchorType,
      componentId: thread.componentId,
      anchorLabel: anchor.label,
      worldX: anchor.x,
      worldY: anchor.y,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      author: thread.author,
      messages: thread.messages,
    };
  });
}

export function buildReviewCommentsJson(
  circuit: Circuit,
  project: Pick<ElectroProject, 'name' | 'titleBlock'>
): ReviewCommentsDocument {
  const threads = circuit.reviewComments ?? [];
  const openCount = threads.filter((t) => t.status === 'open').length;
  return {
    version: '1.0',
    projectName: project.name,
    sheetName: circuit.name || 'Sheet',
    exportedAt: new Date().toISOString(),
    openCount,
    resolvedCount: threads.length - openCount,
    threads: buildReviewCommentsJsonThreads(circuit),
  };
}

export function buildReviewCommentsPdf(
  circuit: Circuit,
  project: Pick<ElectroProject, 'name' | 'titleBlock'>
): jsPDF {
  const meta = buildTitleBlock(circuit, project);
  const threads = sortReviewThreads(circuit.reviewComments ?? []);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Review comments', MARGIN, 22);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${threads.length} thread${threads.length === 1 ? '' : 's'} · ${circuit.name || 'Sheet'}`,
    MARGIN,
    30
  );

  let y = 40;
  const lineH = 5;
  const maxY = PAGE_H - 40;

  const ensureSpace = (needed: number) => {
    if (y + needed > maxY) {
      doc.addPage();
      y = 20;
    }
  };

  if (threads.length === 0) {
    doc.text('No review comments on this sheet.', MARGIN, y);
  }

  threads.forEach((thread, index) => {
    ensureSpace(18);
    const anchor = formatReviewAnchorLabel(circuit, thread);
    const status = thread.status === 'open' ? 'OPEN' : 'RESOLVED';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(
      `${index + 1}. [${status}] ${anchor} — ${threadPreviewText(thread)}`,
      MARGIN,
      y
    );
    y += lineH + 1;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(
      `Created ${new Date(thread.createdAt).toLocaleString()} · Updated ${new Date(thread.updatedAt).toLocaleString()}`,
      MARGIN + 2,
      y
    );
    y += lineH;
    thread.messages.forEach((msg) => {
      ensureSpace(lineH + 2);
      const who = msg.author ? `${msg.author}: ` : '';
      const lines = doc.splitTextToSize(
        `• ${who}${msg.body}`,
        PAGE_W - MARGIN * 2 - 4
      ) as string[];
      lines.forEach((line) => {
        ensureSpace(lineH);
        doc.text(line, MARGIN + 4, y);
        y += lineH;
      });
    });
    y += 2;
  });

  drawPdfTitleBlock(
    doc,
    meta,
    reportSheet('Review comments'),
    1
  );

  return doc;
}

export function downloadReviewCommentsPdf(
  circuit: Circuit,
  project: Pick<ElectroProject, 'name' | 'titleBlock'>
): void {
  const base = safeDrawingFileBase(circuit.name || project.name || 'sheet');
  const doc = buildReviewCommentsPdf(circuit, project);
  doc.save(`${base}-review-comments.pdf`);
}

export function downloadReviewCommentsJson(
  circuit: Circuit,
  project: Pick<ElectroProject, 'name' | 'titleBlock'>
): void {
  const base = safeDrawingFileBase(circuit.name || project.name || 'sheet');
  const payload = buildReviewCommentsJson(circuit, project);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  triggerBlobDownload(blob, `${base}-review-comments.json`);
}
