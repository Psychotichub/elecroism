import type { Circuit, ComponentProperties, SimulationResult } from '../types';
import {
  buildProtectionCoordinationReport,
  type ProtectionCoordinationRow,
} from './circuitDesignValidation';

export interface TccCurveData {
  label: string;
  ratedAmps: number;
  deviceType: string;
  tripCurve: string | null;
  color: string;
  thermalBand: [number, number];
  magneticRange: [number, number];
  stDelayS?: number;
  instantaneousMult?: number;
  componentId: string;
}

const CURVE_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#ec4899',
];

const TCC_DEVICE_TYPES = new Set([
  'mcb',
  'three_phase_mcb',
  'four_phase_mcb',
  'mccb',
  'motorized_mccb',
  'four_pole_motorized_mccb',
  'air_circuit_breaker',
  'hrc_fuse',
  'control_circuit_fuse',
  'motor_protection_circuit_breaker',
]);

function getCurveData(
  row: ProtectionCoordinationRow,
  component: { properties: ComponentProperties; type: string },
  colorIdx: number
): TccCurveData {
  const curve = row.tripOrFamily?.toUpperCase() ?? 'C';
  const color = CURVE_COLORS[colorIdx % CURVE_COLORS.length];

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

export function buildTccChartData(
  circuit: Circuit,
  simulationResult: SimulationResult | null
): { curves: TccCurveData[]; operatingCurrents: Map<string, number> } {
  const report = buildProtectionCoordinationReport(circuit);
  const compMap = new Map(circuit.components.map((c) => [c.id, c]));
  const curves: TccCurveData[] = [];

  for (const row of report.rows) {
    if (!row.ratedAmps || row.ratedAmps <= 0) continue;
    const comp = compMap.get(row.componentId);
    if (!comp || !TCC_DEVICE_TYPES.has(row.deviceType)) continue;
    curves.push(getCurveData(row, comp, curves.length));
  }

  const operatingCurrents = new Map<string, number>();
  if (simulationResult) {
    for (const [id, node] of Object.entries(simulationResult.nodes)) {
      if (node.currentA > 0) operatingCurrents.set(id, node.currentA);
    }
  }

  return { curves, operatingCurrents };
}

const PADDING = { top: 30, right: 20, bottom: 45, left: 55 };
const X_LOG_MIN = -0.5;
const X_LOG_MAX = 2.5;
const Y_LOG_MIN = -2.5;
const Y_LOG_MAX = 4;

export function drawTccChart(
  canvas: HTMLCanvasElement,
  curves: TccCurveData[],
  operatingCurrents: Map<string, number>,
  isDark: boolean,
  explicitSize?: { width: number; height: number }
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = explicitSize ? 1 : window.devicePixelRatio || 1;
  const w = explicitSize?.width ?? canvas.clientWidth;
  const h = explicitSize?.height ?? canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  if (dpr !== 1) ctx.scale(dpr, dpr);

  const plotW = w - PADDING.left - PADDING.right;
  const plotH = h - PADDING.top - PADDING.bottom;

  const xToPixel = (logVal: number) =>
    PADDING.left + ((logVal - X_LOG_MIN) / (X_LOG_MAX - X_LOG_MIN)) * plotW;
  const yToPixel = (logVal: number) =>
    PADDING.top + ((Y_LOG_MAX - logVal) / (Y_LOG_MAX - Y_LOG_MIN)) * plotH;

  ctx.fillStyle = isDark ? '#1a1a2e' : '#fafbfc';
  ctx.fillRect(0, 0, w, h);

  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const gridMajor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const textColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const axisColor = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)';

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

  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING.left, PADDING.top);
  ctx.lineTo(PADDING.left, h - PADDING.bottom);
  ctx.lineTo(w - PADDING.right, h - PADDING.bottom);
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = '9px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';

  const xLabels = [0.5, 1, 2, 5, 10, 20, 50, 100, 200];
  for (const val of xLabels) {
    const logVal = Math.log10(val);
    if (logVal < X_LOG_MIN || logVal > X_LOG_MAX) continue;
    ctx.fillText(`${val}`, xToPixel(logVal), h - PADDING.bottom + 14);
  }
  ctx.font = '10px Helvetica, Arial, sans-serif';
  ctx.fillText('Current (×In)', PADDING.left + plotW / 2, h - 5);

  ctx.font = '9px Helvetica, Arial, sans-serif';
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
  ctx.font = '10px Helvetica, Arial, sans-serif';
  ctx.fillText('Time', 0, 0);
  ctx.restore();

  for (const curve of curves) {
    drawOneCurve(ctx, curve, xToPixel, yToPixel);
  }

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
    ctx.globalAlpha = 1;
    ctx.fillStyle = curve.color;
    ctx.font = 'bold 8px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${amps.toFixed(1)}A`, x, PADDING.top - 4);
    ctx.restore();
  }

  if (curves.length > 0) {
    const legendY = PADDING.top + 6;
    ctx.font = '9px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'left';
    let legendX = PADDING.left + 6;
    for (const curve of curves) {
      ctx.fillStyle = curve.color;
      ctx.fillRect(legendX, legendY, 10, 3);
      ctx.fillStyle = textColor;
      const text = `${curve.label} (${curve.ratedAmps}A ${curve.tripCurve ?? ''})`;
      ctx.fillText(text, legendX + 14, legendY + 5);
      legendX += ctx.measureText(text).width + 26;
    }
  }
}

function drawOneCurve(
  ctx: CanvasRenderingContext2D,
  curve: TccCurveData,
  xToPixel: (logVal: number) => number,
  yToPixel: (logVal: number) => number
): void {
  ctx.save();
  const { thermalBand, magneticRange, color } = curve;
  const thermalK_lower = 40;
  const thermalK_upper = 120;

  ctx.globalAlpha = 0.12;
  ctx.fillStyle = color;
  ctx.beginPath();
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
  for (let i = steps; i >= 0; i--) {
    const ratio = thermalBand[1] + (magneticRange[1] - thermalBand[1]) * (i / steps);
    const logX = Math.log10(ratio);
    const t = thermalK_lower / (ratio * ratio - 1);
    const logY = Math.log10(Math.max(0.003, Math.min(10000, t)));
    ctx.lineTo(xToPixel(logX), yToPixel(logY));
  }
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
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

  const magLowX = xToPixel(Math.log10(magneticRange[0]));
  const magHighX = xToPixel(Math.log10(magneticRange[1]));
  const magTopY = yToPixel(Math.log10(0.01));
  const magBotY = yToPixel(Math.log10(0.004));

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

  ctx.globalAlpha = 0.7;
  ctx.fillStyle = color;
  ctx.font = 'bold 8px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Mag', (magLowX + magHighX) / 2, magTopY - 3);
  ctx.restore();
}

export function renderTccChartPngDataUrl(
  curves: TccCurveData[],
  operatingCurrents: Map<string, number>,
  width = 1200,
  height = 720
): string | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  drawTccChart(canvas, curves, operatingCurrents, false, { width, height });
  return canvas.toDataURL('image/png');
}
