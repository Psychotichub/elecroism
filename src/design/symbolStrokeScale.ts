import { clampComponentScale } from '../utils/geometry';

/** Base schematic stroke weights (world units at 1× component scale). */
export const SYMBOL_STROKE_BASE = 1.4;
export const SYMBOL_DETAIL_STROKE_BASE = 0.8;

export type SymbolRenderMetrics = {
  componentScale: number;
  canvasZoom: number;
};

export function scaledSymbolStroke(
  baseWidth: number,
  componentScale: number
): number {
  return baseWidth * clampComponentScale(componentScale);
}

/**
 * Counter stage zoom so on-canvas labels stay readable at any zoom level
 * while still scaling with per-component `scale`.
 */
export function scaledSymbolFontSize(
  baseSize: number,
  componentScale: number,
  canvasZoom: number
): number {
  const z = Math.max(0.1, canvasZoom);
  return scaledSymbolStroke(baseSize, componentScale) / z;
}

export function symbolStrokeProps(
  baseWidth: number,
  metrics: SymbolRenderMetrics
): { strokeWidth: number; strokeScaleEnabled: false } {
  return {
    strokeWidth: scaledSymbolStroke(baseWidth, metrics.componentScale),
    strokeScaleEnabled: false,
  };
}
