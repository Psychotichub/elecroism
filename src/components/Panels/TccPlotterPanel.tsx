/**
 * Time-Current Curve (TCC) Plotter panel.
 *
 * Renders an industry-standard log-log chart of trip curves for all
 * protective devices in the circuit. Overlays the operating current
 * from the latest simulation result as a vertical indicator.
 *
 * IEC 60898 trip bands:
 *   B curve: thermal 1.13–1.45 In, magnetic 3–5 In
 *   C curve: thermal 1.13–1.45 In, magnetic 5–10 In
 *   D curve: thermal 1.13–1.45 In, magnetic 10–20 In
 *   HRC fuse: ~1.6 In (fusing factor), magnetic ~8 In
 *   ACB: long-time, short-time (IST), instantaneous (Ii)
 */

import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import type { ComponentProperties } from '../../types';
import {
  buildProtectionCoordinationReport,
  type ProtectionCoordinationRow,
} from '../../utils/circuitDesignValidation';

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */

interface TccCurveData {
  label: string;
  ratedAmps: number;
  deviceType: string;
  tripCurve: string | null;
  color: string;
  /** Thermal band [lower, upper] as multiplier of In */
  thermalBand: [number, number];
  /** Magnetic trip range [lower, upper] as multiplier of In */
  magneticRange: [number, number];
  /** Short-time delay seconds (ACB only) */
  stDelayS?: number;
  /** Instantaneous multiplier (ACB only) */
  instantaneousMult?: number;
  componentId: string;
}

/** Colors for up to 8 overlaid curves. */
const CURVE_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
];

/* ------------------------------------------------------------------ */
/*  Trip curve band data per IEC 60898                                 */
/* ------------------------------------------------------------------ */

function getCurveData(
  row: ProtectionCoordinationRow,
  component: { properties: ComponentProperties; type: string },
  colorIdx: number
): TccCurveData {
  const curve = row.tripOrFamily?.toUpperCase() ?? 'C';
  const color = CURVE_COLORS[colorIdx % CURVE_COLORS.length];

  // ACB special handling
  if (row.deviceType === 'air_circuit_breaker') {
    const p = component.properties;
    const iiMult = (p.acbInstantaneousMult as number) ?? 10;
    const stMult = (p.acbShortTimeMult as number) ?? 6;
    const stDelay = (p.acbShortTimeDelayS as number) ?? 0.18;
    return {
      label: row.label,
      ratedAmps: row.ratedAmps ?? 630,
      deviceType: row.deviceType,
      tripCurve: `ACB Ir×${iiMult}`,
      color,
      thermalBand: [1.05, 1.3],
      magneticRange: [stMult, iiMult],
      stDelayS: stDelay,
      instantaneousMult: iiMult,
      componentId: row.componentId,
    };
  }

  // HRC fuse
  if (row.deviceType === 'hrc_fuse') {
    return {
      label: row.label,
      ratedAmps: row.ratedAmps ?? 32,
      deviceType: row.deviceType,
      tripCurve: curve,
      color,
      thermalBand: [1.25, 1.6],
      magneticRange: [6, 10],
      componentId: row.componentId,
    };
  }

  // MPCB
  if (row.deviceType === 'motor_protection_circuit_breaker') {
    return {
      label: row.label,
      ratedAmps: row.ratedAmps ?? 12,
      deviceType: row.deviceType,
      tripCurve: 'MPCB',
      color,
      thermalBand: [1.05, 1.2],
      magneticRange: [8, 14],
      componentId: row.componentId,
    };
  }

  // Standard MCB / MCCB — B, C, D curves
  let magnetic: [number, number];
  switch (curve) {
    case 'B':
      magnetic = [3, 5];
      break;
    case 'D':
      magnetic = [10, 20];
      break;
    case 'C':
    default:
      magnetic = [5, 10];
      break;
  }

  return {
    label: row.label,
    ratedAmps: row.ratedAmps ?? 16,
    deviceType: row.deviceType,
    tripCurve: curve,
    color,
    thermalBand: [1.13, 1.45],
    magneticRange: magnetic,
    componentId: row.componentId,
  };
}

/* ------------------------------------------------------------------ */
/*  Canvas renderer                                                    */
/* ------------------------------------------------------------------ */

const PADDING = { top: 30, right: 20, bottom: 45, left: 55 };

/** Log10 range for the axes. */
const X_LOG_MIN = -0.5; // 0.316 (A/In)
const X_LOG_MAX = 2.5;  // 316 (A/In)
const Y_LOG_MIN = -2.5; // 0.003s
const Y_LOG_MAX = 4;    // 10000s

function drawTccChart(
  canvas: HTMLCanvasElement,
  curves: TccCurveData[],
  operatingCurrents: Map<string, number>,
  isDark: boolean
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const plotW = w - PADDING.left - PADDING.right;
  const plotH = h - PADDING.top - PADDING.bottom;

  const xToPixel = (logVal: number) =>
    PADDING.left + ((logVal - X_LOG_MIN) / (X_LOG_MAX - X_LOG_MIN)) * plotW;
  const yToPixel = (logVal: number) =>
    PADDING.top + ((Y_LOG_MAX - logVal) / (Y_LOG_MAX - Y_LOG_MIN)) * plotH;

  // Background
  ctx.fillStyle = isDark ? '#1a1a2e' : '#fafbfc';
  ctx.fillRect(0, 0, w, h);

  // Grid
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const gridMajor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const textColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const axisColor = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)';

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;

  // Y-axis grid (time)
  for (let decade = -2; decade <= 4; decade++) {
    for (let sub = 1; sub <= 9; sub++) {
      const logVal = decade + Math.log10(sub);
      if (logVal < Y_LOG_MIN || logVal > Y_LOG_MAX) continue;
      const y = yToPixel(logVal);
      ctx.strokeStyle = sub === 1 ? gridMajor : gridColor;
      ctx.lineWidth = sub === 1 ? 0.8 : 0.4;
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(w - PADDING.right, y);
      ctx.stroke();
    }
  }

  // X-axis grid (current multiple)
  for (let decade = Math.floor(X_LOG_MIN); decade <= Math.ceil(X_LOG_MAX); decade++) {
    for (let sub = 1; sub <= 9; sub++) {
      const logVal = decade + Math.log10(sub);
      if (logVal < X_LOG_MIN || logVal > X_LOG_MAX) continue;
      const x = xToPixel(logVal);
      ctx.strokeStyle = sub === 1 ? gridMajor : gridColor;
      ctx.lineWidth = sub === 1 ? 0.8 : 0.4;
      ctx.beginPath();
      ctx.moveTo(x, PADDING.top);
      ctx.lineTo(x, h - PADDING.bottom);
      ctx.stroke();
    }
  }

  // Axes
  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING.left, PADDING.top);
  ctx.lineTo(PADDING.left, h - PADDING.bottom);
  ctx.lineTo(w - PADDING.right, h - PADDING.bottom);
  ctx.stroke();

  // Axis labels
  ctx.fillStyle = textColor;
  ctx.font = '9px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';

  // X-axis labels
  const xLabels = [0.5, 1, 2, 5, 10, 20, 50, 100, 200];
  for (const val of xLabels) {
    const logVal = Math.log10(val);
    if (logVal < X_LOG_MIN || logVal > X_LOG_MAX) continue;
    const x = xToPixel(logVal);
    ctx.fillText(`${val}`, x, h - PADDING.bottom + 14);
  }
  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.fillText('Current (×In)', PADDING.left + plotW / 2, h - 5);

  // Y-axis labels
  ctx.font = '9px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  const yLabels = [0.01, 0.1, 1, 10, 100, 1000, 10000];
  for (const val of yLabels) {
    const logVal = Math.log10(val);
    if (logVal < Y_LOG_MIN || logVal > Y_LOG_MAX) continue;
    const y = yToPixel(logVal);
    let label: string;
    if (val < 1) label = `${val * 1000}ms`;
    else if (val < 60) label = `${val}s`;
    else if (val < 3600) label = `${Math.round(val / 60)}min`;
    else label = `${Math.round(val / 3600)}h`;
    ctx.fillText(label, PADDING.left - 6, y + 3);
  }
  ctx.save();
  ctx.translate(12, PADDING.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.fillText('Time', 0, 0);
  ctx.restore();

  // Draw curves
  for (const curve of curves) {
    drawOneCurve(ctx, curve, xToPixel, yToPixel);
  }

  // Draw operating currents
  for (const curve of curves) {
    const amps = operatingCurrents.get(curve.componentId);
    if (!amps || amps <= 0) continue;
    const ratio = amps / curve.ratedAmps;
    if (ratio < 0.1) continue;
    const logX = Math.log10(ratio);
    if (logX < X_LOG_MIN || logX > X_LOG_MAX) continue;
    const x = xToPixel(logX);

    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = curve.color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(x, PADDING.top);
    ctx.lineTo(x, h - PADDING.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.globalAlpha = 1;
    ctx.fillStyle = curve.color;
    ctx.font = 'bold 8px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${amps.toFixed(1)}A`, x, PADDING.top - 4);
    ctx.restore();
  }

  // Legend
  if (curves.length > 0) {
    const legendY = PADDING.top + 6;
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    let legendX = PADDING.left + 6;
    for (const curve of curves) {
      ctx.fillStyle = curve.color;
      ctx.fillRect(legendX, legendY, 10, 3);
      ctx.fillStyle = textColor;
      ctx.fillText(
        `${curve.label} (${curve.ratedAmps}A ${curve.tripCurve ?? ''})`,
        legendX + 14,
        legendY + 5
      );
      legendX += ctx.measureText(
        `${curve.label} (${curve.ratedAmps}A ${curve.tripCurve ?? ''})`
      ).width + 26;
    }
  }
}

function drawOneCurve(
  ctx: CanvasRenderingContext2D,
  curve: TccCurveData,
  xToPixel: (logVal: number) => number,
  yToPixel: (logVal: number) => number,
) {
  ctx.save();

  const { thermalBand, magneticRange, color } = curve;

  // Thermal region (shaded band)
  // Inverse time curve approximation: t ≈ k / ((I/In)² - 1)
  // Lower bound (hot start) and upper bound (cold start)
  const thermalK_lower = 40;  // hot-start constant
  const thermalK_upper = 120; // cold-start constant

  ctx.globalAlpha = 0.12;
  ctx.fillStyle = color;
  ctx.beginPath();

  // Left edge (lower thermal bound) going up
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const ratio = thermalBand[0] + (magneticRange[0] - thermalBand[0]) * (i / steps);
    const logX = Math.log10(ratio);
    const t = thermalK_upper / (ratio * ratio - 1);
    const logY = Math.log10(Math.max(0.003, Math.min(10000, t)));
    const x = xToPixel(logX);
    const y = yToPixel(logY);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  // Right edge (upper thermal bound) going down
  for (let i = steps; i >= 0; i--) {
    const ratio = thermalBand[1] + (magneticRange[1] - thermalBand[1]) * (i / steps);
    const logX = Math.log10(ratio);
    const t = thermalK_lower / (ratio * ratio - 1);
    const logY = Math.log10(Math.max(0.003, Math.min(10000, t)));
    const x = xToPixel(logX);
    const y = yToPixel(logY);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // Curve lines
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  // Lower bound (fast trip — hot start)
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const ratio = thermalBand[0] + (magneticRange[0] - thermalBand[0]) * (i / steps);
    const logX = Math.log10(ratio);
    const t = thermalK_upper / (ratio * ratio - 1);
    const logY = Math.log10(Math.max(0.003, Math.min(10000, t)));
    const x = xToPixel(logX);
    const y = yToPixel(logY);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Upper bound (slow trip — cold start)
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const ratio = thermalBand[1] + (magneticRange[1] - thermalBand[1]) * (i / steps);
    const logX = Math.log10(ratio);
    const t = thermalK_lower / (ratio * ratio - 1);
    const logY = Math.log10(Math.max(0.003, Math.min(10000, t)));
    const x = xToPixel(logX);
    const y = yToPixel(logY);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Magnetic trip region (vertical band)
  const magLowX = xToPixel(Math.log10(magneticRange[0]));
  const magHighX = xToPixel(Math.log10(magneticRange[1]));
  const magTopY = yToPixel(Math.log10(0.01)); // 10ms
  const magBotY = yToPixel(Math.log10(0.004)); // 4ms

  ctx.globalAlpha = 0.2;
  ctx.fillStyle = color;
  ctx.fillRect(magLowX, magTopY, magHighX - magLowX, magBotY - magTopY);

  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(magLowX, magTopY);
  ctx.lineTo(magLowX, magBotY);
  ctx.lineTo(magHighX, magBotY);
  ctx.lineTo(magHighX, magTopY);
  ctx.stroke();

  // Label the magnetic band
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = color;
  ctx.font = 'bold 8px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  const midMagX = (magLowX + magHighX) / 2;
  ctx.fillText('Mag', midMagX, magTopY - 3);

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const TccPlotterPanel: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const circuit = useCircuitStore((s) => s.circuit);
  const simulationResult = useCircuitStore((s) => s.simulationResult);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Build curve data from protection coordination rows
  const { curves, operatingCurrents } = useMemo(() => {
    const report = buildProtectionCoordinationReport(circuit);
    const compMap = new Map(circuit.components.map((c) => [c.id, c]));
    const curvesArr: TccCurveData[] = [];

    for (const row of report.rows) {
      if (!row.ratedAmps || row.ratedAmps <= 0) continue;
      const comp = compMap.get(row.componentId);
      if (!comp) continue;

      // Skip non-breaker/fuse types (RCDs etc.)
      const validTypes = new Set([
        'mcb', 'three_phase_mcb', 'four_phase_mcb',
        'mccb', 'motorized_mccb', 'four_pole_motorized_mccb',
        'air_circuit_breaker', 'hrc_fuse', 'control_circuit_fuse',
        'motor_protection_circuit_breaker',
      ]);
      if (!validTypes.has(row.deviceType)) continue;

      curvesArr.push(getCurveData(row, comp, curvesArr.length));
    }

    // Operating currents from simulation
    const opCurrents = new Map<string, number>();
    if (simulationResult) {
      for (const [id, node] of Object.entries(simulationResult.nodes)) {
        if (node.currentA > 0) opCurrents.set(id, node.currentA);
      }
    }

    return { curves: curvesArr, operatingCurrents: opCurrents };
  }, [circuit, simulationResult]);

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
