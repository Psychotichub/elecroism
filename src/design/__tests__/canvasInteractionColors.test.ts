import { describe, expect, it } from 'vitest';
import {
  buildCanvasInteractionColors,
  getCanvasInteractionColors,
  setCanvasInteractionTheme,
  withAlpha,
} from '../canvasInteractionColors';

describe('canvasInteractionColors', () => {
  it('maps selection to theme accent', () => {
    const dark = buildCanvasInteractionColors('dark');
    const light = buildCanvasInteractionColors('light');
    expect(dark.selection).toBe('#3b82f6');
    expect(light.selection).toBe('#2563eb');
  });

  it('uses darker semantic greens on light canvas for marquee crossing', () => {
    const light = buildCanvasInteractionColors('light');
    expect(light.marqueeCrossing).toBe('#059669');
    expect(light.marqueeCrossingFill).toContain('rgba');
  });

  it('syncs active colors when theme changes', () => {
    setCanvasInteractionTheme('light');
    expect(getCanvasInteractionColors().selection).toBe('#2563eb');
    setCanvasInteractionTheme('dark');
    expect(getCanvasInteractionColors().selection).toBe('#3b82f6');
  });

  it('builds rgba fills from hex', () => {
    expect(withAlpha('#2563eb', 0.2)).toBe('rgba(37,99,235,0.2)');
  });
});
