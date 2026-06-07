import { describe, expect, it } from 'vitest';
import {
  scaledSymbolFontSize,
  scaledSymbolStroke,
  symbolStrokeProps,
} from '../symbolStrokeScale';

describe('symbolStrokeScale', () => {
  it('scales stroke width with component scale', () => {
    expect(scaledSymbolStroke(1.4, 1)).toBe(1.4);
    expect(scaledSymbolStroke(1.4, 2)).toBe(2.8);
  });

  it('disables Konva stroke scaling for zoom-stable lines', () => {
    expect(symbolStrokeProps(2, { componentScale: 1.5, canvasZoom: 2 })).toEqual({
      strokeWidth: 3,
      strokeScaleEnabled: false,
    });
  });

  it('counter-scales label font size against canvas zoom', () => {
    expect(scaledSymbolFontSize(7, 1, 1)).toBe(7);
    expect(scaledSymbolFontSize(7, 2, 2)).toBe(7);
    expect(scaledSymbolFontSize(7, 1, 2)).toBe(3.5);
  });
});
