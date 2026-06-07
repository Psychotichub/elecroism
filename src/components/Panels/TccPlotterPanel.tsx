/**
 * Time-Current Curve (TCC) Plotter panel.
 */

import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { buildTccChartData, drawTccChart } from '../../utils/tccChart';

const TccPlotterPanel: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const circuit = useCircuitStore((s) => s.circuit);
  const simulationResult = useCircuitStore((s) => s.simulationResult);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { curves, operatingCurrents } = useMemo(
    () => buildTccChartData(circuit, simulationResult),
    [circuit, simulationResult]
  );

  const redraw = useCallback(() => {
    if (!canvasRef.current) return;
    drawTccChart(
      canvasRef.current,
      curves,
      operatingCurrents,
      theme === 'dark'
    );
  }, [curves, operatingCurrents, theme]);

  useEffect(() => {
    redraw();
    const obs = new ResizeObserver(() => redraw());
    if (canvasRef.current) obs.observe(canvasRef.current);
    return () => obs.disconnect();
  }, [redraw]);

  if (curves.length === 0) {
    return (
      <div className={`flex-1 flex items-center justify-center p-6 ${tc.textMuted}`}>
        <div className="text-center">
          <div className="text-3xl mb-2">📊</div>
          <div className="text-sm font-medium mb-1">No protection devices</div>
          <div className="text-xs opacity-70">
            Add MCBs, MCCBs, fuses, or ACBs to see their trip curves plotted here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <div className={`px-3 py-2 text-xs ${tc.textMuted} border-b ${tc.border} shrink-0`}>
        <span className="font-semibold">Time-Current Curves</span>
        <span className="ml-2 opacity-60">
          {curves.length} device{curves.length !== 1 ? 's' : ''} · log-log
        </span>
      </div>
      <div className="flex-1 min-h-0 p-1">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />
      </div>
    </div>
  );
};

export default TccPlotterPanel;
