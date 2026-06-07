import React, { createContext, useContext } from 'react';
import type { SymbolRenderMetrics } from '../../design/symbolStrokeScale';
import {
  SYMBOL_DETAIL_STROKE_BASE,
  SYMBOL_STROKE_BASE,
  scaledSymbolFontSize,
  scaledSymbolStroke,
  symbolStrokeProps,
} from '../../design/symbolStrokeScale';

const SymbolRenderContext = createContext<SymbolRenderMetrics>({
  componentScale: 1,
  canvasZoom: 1,
});

export const SymbolRenderProvider: React.FC<{
  value: SymbolRenderMetrics;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <SymbolRenderContext.Provider value={value}>
    {children}
  </SymbolRenderContext.Provider>
);

export function useSymbolRenderMetrics(): SymbolRenderMetrics {
  return useContext(SymbolRenderContext);
}

export function useSymbolStrokes() {
  const metrics = useSymbolRenderMetrics();
  return {
    metrics,
    stroke: scaledSymbolStroke(SYMBOL_STROKE_BASE, metrics.componentScale),
    detailStroke: scaledSymbolStroke(
      SYMBOL_DETAIL_STROKE_BASE,
      metrics.componentScale
    ),
    strokeProps: (base: number) => symbolStrokeProps(base, metrics),
    fontSize: (base: number) =>
      scaledSymbolFontSize(
        base,
        metrics.componentScale,
        metrics.canvasZoom
      ),
  };
}
