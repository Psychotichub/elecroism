import { useEffect, useRef } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import type { CircuitComponent, ComponentType } from '../../types';
import { isSeriesProtectionTripType } from '../../utils/seriesProtectionTripTypes';

const TRIP_DEBOUNCE_MS = 220;

/** Match `shouldCheckMotorThermalNameplate` in `simulation/engine.ts` (motor overload → `fault`). */
const MOTOR_THERMAL_FAULT_SOUND_TYPES: ReadonlySet<ComponentType> = new Set([
  'motor',
  'three_phase_motor',
]);

type MonitoredEntry = { state: CircuitComponent['state']; type: ComponentType };

function buildMonitoredStateMap(components: CircuitComponent[]): Map<string, MonitoredEntry> {
  const m = new Map<string, MonitoredEntry>();
  for (const c of components) {
    if (!isSeriesProtectionTripType(c.type) && !MOTOR_THERMAL_FAULT_SOUND_TYPES.has(c.type)) {
      continue;
    }
    m.set(c.id, { state: c.state, type: c.type });
  }
  return m;
}

function isNewlyTrippedOrFaulted(
  prev: Map<string, MonitoredEntry>,
  next: Map<string, MonitoredEntry>
): boolean {
  for (const [id, cur] of next) {
    const before = prev.get(id)?.state;
    if (isSeriesProtectionTripType(cur.type) && cur.state === 'tripped' && before !== 'tripped') {
      return true;
    }
    if (
      MOTOR_THERMAL_FAULT_SOUND_TYPES.has(cur.type) &&
      cur.state === 'fault' &&
      before !== 'fault'
    ) {
      return true;
    }
  }
  return false;
}

function makeBrownNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const n = Math.max(1, Math.floor(sr * durationSec));
  const buf = ctx.createBuffer(1, n, sr);
  const d = buf.getChannelData(0);
  let b = 0;
  for (let i = 0; i < n; i++) {
    const w = (Math.random() * 2 - 1) * 0.5;
    b = (b + w * 0.14) * 0.965;
    d[i] = Math.max(-1, Math.min(1, b * 4));
  }
  return buf;
}

/**
 * Procedural “MCCB / MCB trip” — impact + mechanism, not a musical beep.
 * Layers: band-limited noise (contact snap), softer second hit, low thump (mass).
 */
function playNaturalTripSound(ctx: AudioContext): void {
  const t0 = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.38;
  master.connect(ctx.destination);

  const scheduleNoiseHit = (
    when: number,
    dur: number,
    freq: number,
    q: number,
    peak: number,
    attackMs: number,
    decayMs: number
  ) => {
    const buf = makeBrownNoiseBuffer(ctx, dur);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(peak, when + attackMs / 1000);
    g.gain.exponentialRampToValueAtTime(0.0001, when + decayMs / 1000);
    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    src.start(when);
    src.stop(when + dur + 0.008);
  };

  // Main snap (housing + contacts)
  scheduleNoiseHit(t0, 0.042, 2100, 0.85, 0.92, 1.8, 38);
  // Lighter secondary “bounce” inside the mechanism
  scheduleNoiseHit(t0 + 0.014, 0.028, 3800, 1.15, 0.38, 1.2, 26);

  // Body / DIN-rail thump
  const th = ctx.createOscillator();
  th.type = 'sine';
  th.frequency.setValueAtTime(82, t0 + 0.005);
  th.frequency.exponentialRampToValueAtTime(36, t0 + 0.16);
  const gTh = ctx.createGain();
  gTh.gain.setValueAtTime(0.0001, t0 + 0.005);
  gTh.gain.linearRampToValueAtTime(0.62, t0 + 0.022);
  gTh.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
  th.connect(gTh);
  gTh.connect(master);
  th.start(t0 + 0.005);
  th.stop(t0 + 0.22);

  // Faint metal ring-off (very short, low level)
  const ring = ctx.createOscillator();
  ring.type = 'sine';
  ring.frequency.setValueAtTime(2650, t0 + 0.002);
  ring.frequency.exponentialRampToValueAtTime(1180, t0 + 0.055);
  const gRing = ctx.createGain();
  gRing.gain.setValueAtTime(0.0001, t0 + 0.002);
  gRing.gain.linearRampToValueAtTime(0.045, t0 + 0.008);
  gRing.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 900;
  ring.connect(hp);
  hp.connect(gRing);
  gRing.connect(master);
  ring.start(t0 + 0.002);
  ring.stop(t0 + 0.1);
}

/** Served from `public/audio/mcb-trip.wav` (see `scripts/write-mcb-trip-wav.mjs`). */
function tripSampleUrl(): string {
  const base = import.meta.env.BASE_URL;
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}audio/mcb-trip.wav`;
}

function playBufferTrip(ctx: AudioContext, buffer: AudioBuffer): void {
  const t0 = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const g = ctx.createGain();
  g.gain.value = 0.78;
  src.connect(g);
  g.connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + buffer.duration + 0.02);
}

const TripSound = () => {
  const components = useCircuitStore((s) => s.circuit.components);
  const prevMapRef = useRef<Map<string, MonitoredEntry> | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const lastPlayMsRef = useRef(0);
  const startedRef = useRef(false);
  const tripBufferRef = useRef<AudioBuffer | null>(null);
  const tripPreloadStartedRef = useRef(false);

  const preloadMcbTripWav = (ctx: AudioContext) => {
    if (tripBufferRef.current || tripPreloadStartedRef.current) return;
    tripPreloadStartedRef.current = true;
    void (async () => {
      try {
        const res = await fetch(tripSampleUrl());
        if (!res.ok) return;
        tripBufferRef.current = await ctx.decodeAudioData(await res.arrayBuffer());
      } catch {
        /* keep null — use procedural fallback */
      }
    })();
  };

  useEffect(() => {
    const unlock = () => {
      if (ctxRef.current) {
        if (ctxRef.current.state === 'suspended') {
          void ctxRef.current.resume();
        }
        return;
      }
      const AC =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctxRef.current = new AC();
      startedRef.current = true;
      preloadMcbTripWav(ctxRef.current);
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      if (startedRef.current && ctxRef.current) {
        void ctxRef.current.close();
      }
      ctxRef.current = null;
      startedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const next = buildMonitoredStateMap(components);
    const prev = prevMapRef.current;

    if (prev === null) {
      prevMapRef.current = next;
      return;
    }

    const shouldPlay = isNewlyTrippedOrFaulted(prev, next);
    prevMapRef.current = next;

    if (!shouldPlay) return;

    const ctx = ctxRef.current;
    if (!ctx || ctx.state !== 'running') return;

    const now = performance.now();
    if (now - lastPlayMsRef.current < TRIP_DEBOUNCE_MS) return;
    lastPlayMsRef.current = now;

    try {
      preloadMcbTripWav(ctx);
      const buf = tripBufferRef.current;
      if (buf) {
        playBufferTrip(ctx, buf);
      } else {
        playNaturalTripSound(ctx);
      }
    } catch {
      /* ignore */
    }
  }, [components]);

  return null;
};

export default TripSound;
