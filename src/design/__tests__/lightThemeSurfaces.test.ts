import { describe, expect, it } from 'vitest';
import { getCanvasTokens } from '../tokens';

/** Canonical light surfaces — keep in sync with `styles/tokens.css`. */
export const LIGHT_SURFACE = {
  app: '#e8eaef',
  canvas: '#f4f5f7',
  chrome: '#ffffff',
} as const;

describe('light theme surfaces', () => {
  it('uses #f4f5f7 canvas and white chrome panels', () => {
    expect(getCanvasTokens('light').canvasHex).toBe(LIGHT_SURFACE.canvas);
    expect(LIGHT_SURFACE.chrome).toBe('#ffffff');
    expect(LIGHT_SURFACE.app).toBe('#e8eaef');
  });
});
