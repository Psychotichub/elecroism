/**
 * Transient oscilloscope — plots V, I, P vs time for a selected node.
 * Samples the engine on a virtual clock (timer delays, contactor pickup)
 * with motor inrush overlay (≈6× FLC decay).
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FiPlay, FiPause, FiRefreshCw } from 'react-icons/fi';
import { useCircuitStore } from '../../store/circuitStore';
import { useUiStore } from '../../store/uiStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { buildTimelineAsync } from '../../simulation/simulationClient';
import type {
  TimelineSample,
  TimelineScenario,
} from '../../simulation/transientTimeline';
import { isProtectionDeviceType } from '../../simulation/transientTimeline';

type ScopeChannel = 'voltage' | 'current' | 'power' | 'thermal';

const CHANNEL_COLORS: Record<ScopeChannel, string> = {
  voltage: '#3b82f6',
  current: '#ef4444',
  power: '#22c55e',
  thermal: '#f59e0b',
};

const PADDING = { top: 28, right: 16, bottom: 36, left: 52 };

const OscilloscopePanel: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const circuit = useCircuitStore((s) => s.circuit);
  const selectedId = useCircuitStore((s) => s.selectedId);
  const setMotorThermalById = useUiStore((s) => s.setMotorThermalById);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeline, setTimeline] = useState<TimelineSample[] | null>(null);
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [cursorMs, setCursorMs] = useState(0);
  const [pickedTargetId, setPickedTargetId] = useState<string>('');
  const [channels, setChannels] = useState<Set<ScopeChannel>>(
    () => new Set<ScopeChannel>(['voltage', 'current'])
  );
  const [durationMs, setDurationMs] = useState(5000);
  const [scenario, setScenario] = useState<TimelineScenario>('normal');

  const scopeTargets = useMemo(() => {
    if (scenario === 'fault_clearing') {
      return circuit.components.filter(
        (c) => isProtectionDeviceType(c.type) && c.state !== 'off'
      );
    }
    return circuit.components.filter((c) =>
      [
        'power_source',
        'three_phase_source',
        'dc_power_source',
        'lamp',
        'motor',
        'three_phase_motor',
        'heater',
        'generic_load',
        'socket',
        'mcb',
        'contactor',
        'three_phase_contactor',
      ].includes(c.type)
    );
  }, [circuit.components, scenario]);

  const targetId = useMemo(() => {
    if (
      pickedTargetId &&
      scopeTargets.some((c) => c.id === pickedTargetId)
    ) {
      return pickedTargetId;
    }
    const pick =
      scopeTargets.find((c) => c.id === selectedId) ?? scopeTargets[0];
    return pick?.id ?? '';
  }, [pickedTargetId, scopeTargets, selectedId]);

  const targetIsMotor = useMemo(() => {
    const t = circuit.components.find((c) => c.id === targetId);
    return t?.type === 'motor' || t?.type === 'three_phase_motor';
  }, [circuit.components, targetId]);

  const handleRecord = useCallback(async () => {
    setRecording(true);
    setPlaying(false);
    try {
      const faultMode = scenario === 'fault_clearing' && targetId;
      const atsMode = scenario === 'ats_transfer';
      const samples = await buildTimelineAsync(circuit, {
        durationMs: faultMode || atsMode ? undefined : durationMs,
        stepMs: faultMode ? 1 : atsMode ? 100 : 50,
        scenario,
        faultDeviceId: faultMode ? targetId : undefined,
      });
      setTimeline(samples);
      setCursorMs(0);
      const firstThermal = samples[0]?.motorThermal;
      if (firstThermal) {
        setMotorThermalById(firstThermal);
      }
    } finally {
      setRecording(false);
    }
  }, [circuit, durationMs, scenario, targetId, setMotorThermalById]);

  useEffect(() => {
    if (!playing || !timeline || timeline.length === 0) return;
    const maxMs = timeline[timeline.length - 1].timeMs;
    const step = maxMs < 2000 ? 2 : 50;
    const id = window.setInterval(() => {
      setCursorMs((prev) => {
        const next = prev + step;
        if (next >= maxMs) {
          setPlaying(false);
          return maxMs;
        }
        return next;
      });
    }, step);
    return () => window.clearInterval(id);
  }, [playing, timeline]);

  useEffect(() => {
    if (!timeline?.length) return;
    const idx = timeline.findIndex((s) => s.timeMs >= cursorMs);
    const snap = timeline[idx < 0 ? timeline.length - 1 : idx];
    if (!snap?.motorThermal) return;
    setMotorThermalById(snap.motorThermal);
  }, [timeline, cursorMs, setMotorThermalById]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !timeline || timeline.length === 0 || !targetId) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const plotW = w - PADDING.left - PADDING.right;
    const plotH = h - PADDING.top - PADDING.bottom;

    const bg = theme === 'dark' ? '#111827' : '#f9fafb';
    const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';
    const textColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
    const axisColor = theme === 'dark' ? '#6b7280' : '#9ca3af';

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const maxTime = timeline[timeline.length - 1].timeMs || 1;
    const timeInMs = maxTime < 2000;
    const series: Record<ScopeChannel, number[]> = {
      voltage: [],
      current: [],
      power: [],
      thermal: [],
    };
    for (const s of timeline) {
      const n = s.nodes[targetId];
      series.voltage.push(n?.voltageV ?? 0);
      series.current.push(n?.currentA ?? 0);
      series.power.push(n?.powerW ?? 0);
      series.thermal.push(s.motorThermal?.[targetId]?.thermalPct ?? 0);
    }

    let yMax = 0;
    for (const ch of channels) {
      if (ch === 'thermal') {
        yMax = Math.max(yMax, 100);
        continue;
      }
      for (const v of series[ch]) yMax = Math.max(yMax, v);
    }
    yMax = yMax <= 0 ? 1 : yMax * 1.1;

    const xToPx = (t: number) => PADDING.left + (t / maxTime) * plotW;
    const yToPx = (v: number) => PADDING.top + plotH - (v / yMax) * plotH;

    for (let i = 0; i <= 4; i++) {
      const y = PADDING.top + (plotH * i) / 4;
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(w - PADDING.right, y);
      ctx.stroke();
    }

    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING.left, PADDING.top);
    ctx.lineTo(PADDING.left, h - PADDING.bottom);
    ctx.lineTo(w - PADDING.right, h - PADDING.bottom);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(timeInMs ? 'Time (ms)' : 'Time (s)', PADDING.left + plotW / 2, h - 6);
    for (let i = 0; i <= 4; i++) {
      const t = (maxTime * i) / 4;
      const x = xToPx(t);
      ctx.fillText(
        timeInMs ? `${t.toFixed(0)}` : `${(t / 1000).toFixed(1)}`,
        x,
        h - PADDING.bottom + 14
      );
    }

    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const v = (yMax * (4 - i)) / 4;
      const y = PADDING.top + (plotH * i) / 4;
      const unit = channels.has('thermal')
        ? '%'
        : channels.has('current')
          ? 'A'
          : channels.has('power')
            ? 'W'
            : 'V';
      ctx.fillText(`${v.toFixed(v >= 100 ? 0 : 1)}${unit}`, PADDING.left - 6, y + 3);
    }

    if (channels.has('thermal')) {
      const tripY = yToPx(100);
      ctx.strokeStyle = theme === 'dark' ? '#7f1d1d' : '#fecaca';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(PADDING.left, tripY);
      ctx.lineTo(w - PADDING.right, tripY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const ch of channels) {
      ctx.strokeStyle = CHANNEL_COLORS[ch];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      timeline.forEach((s, idx) => {
        const x = xToPx(s.timeMs);
        const y = yToPx(series[ch][idx]);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    const cursorX = xToPx(cursorMs);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(cursorX, PADDING.top);
    ctx.lineTo(cursorX, h - PADDING.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    const cursorIdx = timeline.findIndex((s) => s.timeMs >= cursorMs);
    const idx = cursorIdx < 0 ? timeline.length - 1 : cursorIdx;
    const snap = timeline[idx];
    const n = snap?.nodes[targetId];
    const th = snap?.motorThermal?.[targetId];
    if (n) {
      ctx.fillStyle = textColor;
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      const tLabel =
        snap.timeMs < 2000
          ? `t=${snap.timeMs.toFixed(0)}ms`
          : `t=${(snap.timeMs / 1000).toFixed(2)}s`;
      const thermalBit =
        th != null ? `  Thermal=${th.thermalPct.toFixed(1)}%` : '';
      const atsBit = snap.atsPhaseLabel ? `  ATS: ${snap.atsPhaseLabel}` : '';
      ctx.fillText(
        `${tLabel}  V=${n.voltageV.toFixed(1)}  I=${n.currentA.toFixed(2)}  P=${n.powerW.toFixed(1)}${thermalBit}${atsBit}`,
        PADDING.left + 4,
        PADDING.top - 8
      );
    }
  }, [timeline, targetId, channels, cursorMs, theme]);

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  const toggleChannel = (ch: ScopeChannel) => {
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) {
        if (next.size > 1) next.delete(ch);
      } else next.add(ch);
      return next;
    });
  };

  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden ${tc.text}`}>
      <div className={`shrink-0 border-b ${tc.border} px-3 py-2`}>
        <div className={`text-xs font-semibold ${tc.textBright}`}>
          Oscilloscope
        </div>
        <p className={`mt-0.5 text-[10px] leading-snug ${tc.textMuted}`}>
          Motor start: inrush decay, voltage dip, and thermal % (I²t vs overload
          curve). Fault clearing: bolted fault until device trip (ms resolution).
        </p>
      </div>

      <div className={`shrink-0 space-y-2 border-b ${tc.border} px-3 py-2`}>
        <label className={`block text-[10px] ${tc.textMuted}`}>
          Scenario
          <select
            value={scenario}
            onChange={(e) => {
              setScenario(e.target.value as TimelineScenario);
              setPickedTargetId('');
              setTimeline(null);
            }}
            className={`mt-0.5 w-full rounded border ${tc.border} ${tc.canvas} px-2 py-1 text-xs`}
          >
            <option value="normal">Motor start / normal</option>
            <option value="fault_clearing">Fault clearing</option>
            <option value="ats_transfer">ATS transfer sequence</option>
          </select>
        </label>

        <label className={`block text-[10px] ${tc.textMuted}`}>
          Channel
          <select
            value={targetId}
            onChange={(e) => setPickedTargetId(e.target.value)}
            className={`mt-0.5 w-full rounded border ${tc.border} ${tc.canvas} px-2 py-1 text-xs`}
          >
            {scopeTargets.map((c) => (
              <option key={c.id} value={c.id}>
                {(c.label || c.type).trim()} ({c.type.replace(/_/g, ' ')})
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap gap-1">
          {(['voltage', 'current', 'power', ...(targetIsMotor ? (['thermal'] as const) : [])] as ScopeChannel[]).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => toggleChannel(ch)}
              className={`rounded px-2 py-0.5 text-[10px] font-semibold capitalize ${
                channels.has(ch)
                  ? 'text-white'
                  : `${tc.textMuted} opacity-50`
              }`}
              style={
                channels.has(ch)
                  ? { backgroundColor: CHANNEL_COLORS[ch] }
                  : undefined
              }
            >
              {ch}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {scenario === 'normal' ? (
            <label className={`text-[10px] ${tc.textMuted}`}>
              Duration
              <select
                value={durationMs}
                onChange={(e) => setDurationMs(Number(e.target.value))}
                className={`ml-1 rounded border ${tc.border} ${tc.canvas} px-1 py-0.5 text-[10px]`}
              >
                <option value={3000}>3 s</option>
                <option value={5000}>5 s</option>
                <option value={10000}>10 s</option>
              </select>
            </label>
          ) : scenario === 'ats_transfer' ? (
            <span className={`text-[10px] ${tc.textMuted}`}>
              ATS timeline · 100 ms steps · phase in cursor readout
            </span>
          ) : (
            <span className={`text-[10px] ${tc.textMuted}`}>
              Auto duration · 1 ms steps
            </span>
          )}
          <button
            type="button"
            onClick={() => void handleRecord()}
            disabled={recording}
            className="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
          >
            <FiRefreshCw className={recording ? 'animate-spin' : ''} size={12} />
            {recording ? 'Recording…' : 'Record'}
          </button>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            disabled={!timeline?.length}
            className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold ${
              playing ? 'bg-amber-600 text-white' : `${tc.toolbar} ${tc.text}`
            } disabled:opacity-40`}
          >
            {playing ? <FiPause size={12} /> : <FiPlay size={12} />}
            {playing ? 'Pause' : 'Play'}
          </button>
        </div>

        {timeline && timeline.length > 0 ? (
          <input
            type="range"
            min={0}
            max={timeline[timeline.length - 1].timeMs}
            step={timeline[timeline.length - 1].timeMs < 2000 ? 1 : 50}
            value={cursorMs}
            onChange={(e) => {
              setPlaying(false);
              setCursorMs(Number(e.target.value));
            }}
            className="w-full"
          />
        ) : null}
      </div>

      <div className="relative min-h-0 flex-1 p-2">
        <canvas ref={canvasRef} className="h-full w-full rounded border border-gray-700/40" />
        {!timeline?.length && !recording ? (
          <div
            className={`pointer-events-none absolute inset-0 flex items-center justify-center text-xs ${tc.textMuted}`}
          >
            Press Record to capture a timeline
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default OscilloscopePanel;
