import { describe, expect, it } from 'vitest';
import {
  EXPORT_BODY_SM_PT,
  EXPORT_CAPTION_PT,
  EXPORT_TITLE_SM_PT,
  pxToPt,
} from '../exportTypography';
import {
  LEGEND_BODY_SM_PT,
  LEGEND_CAPTION_PT,
  LEGEND_TITLE_PT,
} from '../legendTypography';

describe('exportTypography', () => {
  it('maps UI px sizes to PDF points at 96dpi', () => {
    expect(pxToPt(13)).toBe(9.75);
    expect(pxToPt(11)).toBe(8.25);
    expect(pxToPt(10)).toBe(7.5);
    expect(EXPORT_TITLE_SM_PT).toBe(9.75);
    expect(EXPORT_BODY_SM_PT).toBe(8.25);
    expect(EXPORT_CAPTION_PT).toBe(7.5);
  });

  it('keeps legend typography aliases aligned', () => {
    expect(LEGEND_BODY_SM_PT).toBe(EXPORT_BODY_SM_PT);
    expect(LEGEND_CAPTION_PT).toBe(EXPORT_CAPTION_PT);
    expect(LEGEND_TITLE_PT).toBe(EXPORT_TITLE_SM_PT);
  });
});
