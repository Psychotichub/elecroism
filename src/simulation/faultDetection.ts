/**
 * Fault detection module.
 *
 * Contains `checkFaults` and `checkAcbFaults` — the protection coordination
 * logic that decides whether a series protection device trips.
 * Extracted from the monolithic `engine.ts`.
 */

import type {
  CircuitComponent,
  FaultEvent,
  AcbSimState,
} from '../types';
import { mcbLayoutPoles } from '../store/circuitConnectionGeometry';

/* ------------------------------------------------------------------ */
/*  MCB magnetic multiplier                                           */
/* ------------------------------------------------------------------ */

/**
 * Simplified IEC-style magnetic window: B ≈ 3×In, C ≈ 5×In, D ≈ 10×In (instantaneous).
 * Unknown curve defaults to C.
 */
function mcbMagneticInMultiple(component: CircuitComponent): number {
  const c = (component.properties.tripCurve || 'C')
    .toString()
    .trim()
    .toUpperCase();
  if (c === 'B') return 3;
  if (c === 'D') return 10;
  return 5;
}

/* ------------------------------------------------------------------ */
/*  ACB sim state helper                                              */
/* ------------------------------------------------------------------ */

function ensureAcbSim(component: CircuitComponent): AcbSimState {
  if (!component.acbSimState) component.acbSimState = {};
  return component.acbSimState;
}

function acbArcFootnote(hz: number): string {
  const halfMs = 1000 / (2 * hz);
  return ` Blow-out drives the arc into the splitting chute; extinction near current zero (~${halfMs.toFixed(1)} ms half-cycle at ${hz} Hz).`;
}

/* ------------------------------------------------------------------ */
/*  ACB four-zone protection                                          */
/* ------------------------------------------------------------------ */

export function checkAcbFaults(
  component: CircuitComponent,
  currentA: number,
  ctx: { lnFaultPath: boolean },
  wallMs: number
): FaultEvent | null {
  const p = component.properties;
  const Ir = Math.max(1, p.ratingAmps ?? 630);
  const hz = Math.max(40, Math.min(70, p.acbLineFrequencyHz ?? 50));
  const foot = acbArcFootnote(hz);
  const halfCycleMs = 1000 / (2 * hz);

  const iiMult = Math.max(2, p.acbInstantaneousMult ?? 10);
  let stMult = p.acbShortTimeMult ?? 6;
  if (stMult >= iiMult) stMult = Math.max(1.5, iiMult - 0.5);
  const instantA = Ir * iiMult;
  const stA = Ir * stMult;
  const ig = p.acbEarthFaultAmps ?? 0;
  const gOn = p.acbEarthFaultEnabled ?? false;

  const stDelayS = Math.max(0, p.acbShortTimeDelayS ?? 0.18);
  const earthDelayS = Math.max(0, p.acbEarthFaultDelayS ?? 0.1);
  const thermalLimit = Math.max(5, p.acbThermalTripIntegral ?? 80);

  const sim = ensureAcbSim(component);
  const last = sim.lastWallMs;
  const coldStart = last == null;
  let dt = 0;
  if (last != null) {
    dt = (wallMs - last) / 1000;
    if (dt < 0) dt = 0;
    if (dt > 1.5) dt = 1.5;
  }
  sim.lastWallMs = wallMs;

  // Long-time thermal only below short-time pickup (L-band vs ST-band).
  if (currentA < stA) {
    const ratio = currentA / Ir;
    if (ratio > 1) {
      sim.thermalExcess =
        (sim.thermalExcess ?? 0) + (ratio * ratio - 1) * dt;
    } else if (dt > 0) {
      const cool = (1 - ratio) * 2 * dt;
      sim.thermalExcess = Math.max(0, (sim.thermalExcess ?? 0) - cool);
    }
  }

  if (currentA >= instantA) {
    if (coldStart) {
      sim.instantTripAtMs = null;
      return {
        id: crypto.randomUUID(),
        type: 'short_circuit',
        affectedComponentId: component.id,
        message: `ACB "${component.label}" instantaneous: ${currentA.toFixed(0)}A ≥ ${iiMult}×Ir (${instantA.toFixed(0)}A); first evaluation — subsequent sustained faults use ~½-cycle delay.${foot}`,
        severity: 'critical',
        timestamp: wallMs,
      };
    }
    if (sim.instantTripAtMs == null) {
      sim.instantTripAtMs = wallMs + halfCycleMs;
    }
    if (wallMs >= (sim.instantTripAtMs ?? 0)) {
      sim.instantTripAtMs = null;
      return {
        id: crypto.randomUUID(),
        type: 'short_circuit',
        affectedComponentId: component.id,
        message: `ACB "${component.label}" instantaneous: ${currentA.toFixed(0)}A ≥ ${iiMult}×Ir (${instantA.toFixed(0)}A); opening timed to ~½ cycle for current-zero interruption.${foot}`,
        severity: 'critical',
        timestamp: wallMs,
      };
    }
    return null;
  }
  sim.instantTripAtMs = null;

  if (currentA >= stA && currentA < instantA) {
    if (sim.stZoneSinceMs == null) sim.stZoneSinceMs = wallMs;
    const elapsedS = (wallMs - sim.stZoneSinceMs) / 1000;
    if (elapsedS >= stDelayS) {
      sim.stZoneSinceMs = null;
      return {
        id: crypto.randomUUID(),
        type: 'short_circuit',
        affectedComponentId: component.id,
        message: `ACB "${component.label}" short-time: ${currentA.toFixed(0)}A ≥ ${stMult}×Ir (${stA.toFixed(0)}A), below ${iiMult}×Ir; definite delay ${stDelayS}s elapsed.${foot}`,
        severity: 'critical',
        timestamp: wallMs,
      };
    }
    return null;
  }
  sim.stZoneSinceMs = null;

  if (
    gOn &&
    ig > 0 &&
    ctx.lnFaultPath &&
    currentA >= ig &&
    currentA < stA
  ) {
    if (sim.earthZoneSinceMs == null) sim.earthZoneSinceMs = wallMs;
    const elapsedS = (wallMs - sim.earthZoneSinceMs) / 1000;
    if (elapsedS >= earthDelayS) {
      sim.earthZoneSinceMs = null;
      return {
        id: crypto.randomUUID(),
        type: 'earth_fault',
        affectedComponentId: component.id,
        message: `ACB "${component.label}" earth-fault: ${currentA.toFixed(0)}A ≥ Ig ${ig}A (L–N fault path); definite delay ${earthDelayS}s elapsed.${foot}`,
        severity: 'critical',
        timestamp: wallMs,
      };
    }
    return null;
  }
  sim.earthZoneSinceMs = null;

  if ((sim.thermalExcess ?? 0) >= thermalLimit) {
    return {
      id: crypto.randomUUID(),
      type: 'overload',
      affectedComponentId: component.id,
      message: `ACB "${component.label}" long-time (inverse-time integral below ST): ~${(currentA / Ir).toFixed(2)}×Ir sustained; ∫max(0,(I/Ir)²−1)dt ≥ ${thermalLimit}.${foot}`,
      severity: 'critical',
      timestamp: wallMs,
    };
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Generic protection device fault check                             */
/* ------------------------------------------------------------------ */

export function checkFaults(
  component: CircuitComponent,
  currentA: number,
  faultCtx?: { lnFaultPath: boolean; wallMs?: number }
): FaultEvent | null {
  const p = component.properties;
  const ctx = faultCtx ?? { lnFaultPath: false };
  const wall = faultCtx?.wallMs ?? Date.now();

  if (component.type === 'air_circuit_breaker') {
    return checkAcbFaults(component, currentA, ctx, wall);
  }

  if (
    component.type === 'mcb' ||
    component.type === 'hrc_fuse' ||
    component.type === 'control_circuit_fuse' ||
    component.type === 'earth_leakage_relay_cbct' ||
    component.type === 'motor_protection_circuit_breaker' ||
    component.type === 'three_phase_mcb' ||
    component.type === 'four_phase_mcb' ||
    component.type === 'motorized_mccb' ||
    component.type === 'four_pole_motorized_mccb'
  ) {
    const tag =
      component.type === 'three_phase_mcb'
        ? '3P MCB'
        : component.type === 'motor_protection_circuit_breaker'
          ? 'MPCB'
        : component.type === 'four_phase_mcb'
          ? '4P MCB'
          : component.type === 'hrc_fuse'
            ? 'HRC Fuse'
            : component.type === 'control_circuit_fuse'
              ? 'Control Fuse'
            : component.type === 'earth_leakage_relay_cbct'
              ? 'ELR+CBCT'
          : component.type === 'four_pole_motorized_mccb'
            ? '4P Motorized MCCB'
            : component.type === 'motorized_mccb'
              ? 'Motorized MCCB'
              : component.type === 'mcb' && mcbLayoutPoles(component) === 2
              ? '2P MCB'
              : 'MCB';
    const inA = Math.max(0.1, p.ratingAmps ?? 16);
    const curve = (p.tripCurve || 'C').toString().trim().toUpperCase() || 'C';
    const kMag =
      component.type === 'hrc_fuse'
        ? 8
        : component.type === 'control_circuit_fuse'
          ? 6
        : component.type === 'earth_leakage_relay_cbct'
          ? 5
          : component.type === 'motor_protection_circuit_breaker'
            ? 12
          : mcbMagneticInMultiple(component);
    const magneticA = kMag * inA;
    if (currentA >= magneticA) {
      return {
        id: crypto.randomUUID(),
        type: 'short_circuit',
        affectedComponentId: component.id,
        message: `${tag} "${component.label}" magnetic (${curve}) trip: ${currentA.toFixed(0)}A ≥ ${kMag}×${inA.toFixed(0)}A (${magneticA.toFixed(0)}A)`,
        severity: 'critical',
        timestamp: wall,
      };
    }
    const thermalPickup =
      component.type === 'motor_protection_circuit_breaker'
        ? (p.ratingAmps ?? 12) * 1.1
        : p.ratingAmps;
    if (thermalPickup && currentA > thermalPickup) {
      return {
        id: crypto.randomUUID(),
        type: 'overload',
        affectedComponentId: component.id,
        message: `${tag} "${component.label}" thermal overload: ${currentA.toFixed(1)}A > ${
          component.type === 'motor_protection_circuit_breaker'
            ? thermalPickup.toFixed(1)
            : `${p.ratingAmps}`
        }A; magnetic at ${kMag}×In (${magneticA.toFixed(0)}A)`,
        severity: 'critical',
        timestamp: wall,
      };
    }
    if (
      component.type === 'earth_leakage_relay_cbct' &&
      ctx.lnFaultPath &&
      currentA > 0.1
    ) {
      return {
        id: crypto.randomUUID(),
        type: 'earth_fault',
        affectedComponentId: component.id,
        message: `ELR+CBCT "${component.label}" earth-fault trip at ${
          p.earthLeakageTripMa ?? 30
        }mA setting`,
        severity: 'critical',
        timestamp: wall,
      };
    }
  }

  if (
    component.type === 'overload_relay' &&
    p.ratingAmps &&
    currentA > p.ratingAmps
  ) {
    if (currentA > 1000) {
      return {
        id: crypto.randomUUID(),
        type: 'short_circuit',
        affectedComponentId: component.id,
        message: `Overload relay "${component.label}" short-circuit trip: ${currentA.toFixed(0)}A`,
        severity: 'critical',
        timestamp: wall,
      };
    }
    return {
      id: crypto.randomUUID(),
      type: 'overload',
      affectedComponentId: component.id,
      message: `Overload relay "${component.label}" tripped: ${currentA.toFixed(1)}A exceeds ${p.ratingAmps}A`,
      severity: 'critical',
      timestamp: wall,
    };
  }

  if (
    (component.type === 'rcd' ||
      component.type === 'residual_current_circuit_breaker') &&
    currentA > 1000
  ) {
    return {
      id: crypto.randomUUID(),
      type: 'short_circuit',
      affectedComponentId: component.id,
      message: `Short circuit detected at "${component.label}"`,
      severity: 'critical',
      timestamp: wall,
    };
  }

  return null;
}
