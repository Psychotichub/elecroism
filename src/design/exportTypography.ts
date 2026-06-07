/**
 * jsPDF font sizes aligned with `es-typo-*` tokens (96dpi: 1px ≈ 0.75pt).
 * @see src/index.css typography utilities
 */
export function pxToPt(px: number): number {
  return px * 0.75;
}

/** `es-typo-title-sm` — 13px / 18px */
export const EXPORT_TITLE_SM_PT = pxToPt(13);

/** `es-typo-body` — 12px / 18px */
export const EXPORT_BODY_PT = pxToPt(12);

/** `es-typo-body-sm` — 11px / 16px */
export const EXPORT_BODY_SM_PT = pxToPt(11);

/** `es-typo-caption` — 10px / 14px */
export const EXPORT_CAPTION_PT = pxToPt(10);

/** `es-typo-label` — 11px semibold */
export const EXPORT_LABEL_PT = pxToPt(11);

/** Approximate body-sm line step for PDF rows (16px → ~4.2mm). */
export const EXPORT_BODY_SM_LINE_MM = 4.2;
