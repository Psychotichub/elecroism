/**
 * Breaker Accessory Actions
 *
 * Evaluates simulation outcomes for `shunt_trip_coil`, `closing_coil`,
 * `uvr_release`, and `motor_operator_kit` after the potential propagation
 * pass has run.  When a coil is energized (or de-energized for UVR) and
 * the accessory is linked to a parent breaker via `breakerParentId`, this
 * module mutates the parent breaker's `state` accordingly and returns
 * `anyTripped = true` so the engine knows to re-simulate.
 *
 * Priority order (matches real-world sequencing):
 *   1. UVR release — drop open if de-energized (cannot be overridden by CC)
 *   2. Closing coil — reset if parent is off/tripped AND UVR not de-energized
 *   3. Shunt trip coil — trip if energized and parent is on
 *   4. Motor operator — close or open based on motorOperatorCommand
 */

import type { Circuit, CircuitComponent, FaultEvent } from '../types';
import type { PotentialSets } from './engineTypes';
import { linePotentialAt, findTerminalByLabel } from './engineTypes';

/* ------------------------------------------------------------------ */
/*  Breaker parent types                                               */
/* ------------------------------------------------------------------ */

const BREAKER_TYPES = new Set([
  'mccb',
  'motorized_mccb',
  'four_pole_motorized_mccb',
  'air_circuit_breaker',
  'three_phase_mcb',
  'motor_protection_circuit_breaker',
]);

export function isBreakerType(type: string): boolean {
  return BREAKER_TYPES.has(type);
}

/* ------------------------------------------------------------------ */
/*  Coil energization check                                            */
/* ------------------------------------------------------------------ */

/**
 * Returns true when both A1 and A2 terminals of the accessory are covered
 * by the current potential sets (live on one side, neutral on the other).
 */
function isCoilEnergized(
  accessory: CircuitComponent,
  potentials: PotentialSets
): boolean {
  const a1Key = findTerminalByLabel(accessory, 'A1');
  const a2Key = findTerminalByLabel(accessory, 'A2');
  if (!a1Key || !a2Key) return false;
  const a1Live = linePotentialAt(potentials, a1Key);
  const a1Neutral = potentials.neutral.has(a1Key);
  const a2Live = linePotentialAt(potentials, a2Key);
  const a2Neutral = potentials.neutral.has(a2Key);
  // Energized when one terminal is line and the other is neutral
  return (a1Live && a2Neutral) || (a2Live && a1Neutral);
}

/**
 * Returns true when CTRL_L / CTRL_N terminals of a motor_operator_kit are
 * energized (one live, one neutral).
 */
function isMotorOperatorEnergized(
  accessory: CircuitComponent,
  potentials: PotentialSets
): boolean {
  const lKey = findTerminalByLabel(accessory, 'CTRL_L');
  const nKey = findTerminalByLabel(accessory, 'CTRL_N');
  if (!lKey || !nKey) return false;
  return linePotentialAt(potentials, lKey) && potentials.neutral.has(nKey);
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                   */
/* ------------------------------------------------------------------ */

export interface BreakerAccessoryResult {
  anyTripped: boolean;
  faults: FaultEvent[];
}

export function applyBreakerAccessoryActions(
  circuit: Circuit,
  potentials: PotentialSets,
  wallMs: number
): BreakerAccessoryResult {
  let anyTripped = false;
  const faults: FaultEvent[] = [];

  const accessories = circuit.components.filter(
    (c) =>
      c.type === 'shunt_trip_coil' ||
      c.type === 'closing_coil' ||
      c.type === 'uvr_release' ||
      c.type === 'motor_operator_kit'
  );

  if (accessories.length === 0) return { anyTripped: false, faults: [] };

  /** Map breaker IDs to their live component objects for quick mutation. */
  const breakerById = new Map<string, CircuitComponent>();
  for (const c of circuit.components) {
    if (isBreakerType(c.type)) breakerById.set(c.id, c);
  }

  // Collect per-breaker: which UVR accessories (if any) are NOT energized
  const uvrDeenergizedBreakerIds = new Set<string>();
  for (const acc of accessories) {
    if (acc.type !== 'uvr_release') continue;
    const parentId = acc.properties.breakerParentId;
    if (!parentId) continue;
    if (!breakerById.has(parentId)) continue;
    if (!isCoilEnergized(acc, potentials)) {
      uvrDeenergizedBreakerIds.add(parentId);
    }
  }

  // -----------------------------------------------------------------
  // Step 1: UVR release — drop open breakers that lose hold voltage
  // -----------------------------------------------------------------
  for (const acc of accessories) {
    if (acc.type !== 'uvr_release') continue;
    const parentId = acc.properties.breakerParentId;
    if (!parentId) continue;
    const parent = breakerById.get(parentId);
    if (!parent) continue;

    const energized = isCoilEnergized(acc, potentials);
    if (!energized && parent.state === 'on') {
      parent.state = 'off';
      faults.push({
        id: crypto.randomUUID(),
        type: 'trip',
        affectedComponentId: parent.id,
        message: `UVR release "${acc.label}" lost control voltage — breaker "${parent.label}" opened.`,
        severity: 'warning',
        timestamp: wallMs,
      });
      anyTripped = true;
    }
  }

  // -----------------------------------------------------------------
  // Step 2: Closing coil — reset off/tripped breaker (only if UVR ok)
  // -----------------------------------------------------------------
  for (const acc of accessories) {
    if (acc.type !== 'closing_coil') continue;
    const parentId = acc.properties.breakerParentId;
    if (!parentId) continue;
    const parent = breakerById.get(parentId);
    if (!parent) continue;

    // Closing coil is ineffective if a UVR on the same breaker is de-energized
    if (uvrDeenergizedBreakerIds.has(parentId)) continue;

    const energized = isCoilEnergized(acc, potentials);
    if (energized && (parent.state === 'off' || parent.state === 'tripped')) {
      parent.state = 'on';
      anyTripped = true; // re-sim so power flows again
    }
  }

  // -----------------------------------------------------------------
  // Step 3: Shunt trip coil — trip closed breaker
  // -----------------------------------------------------------------
  for (const acc of accessories) {
    if (acc.type !== 'shunt_trip_coil') continue;
    const parentId = acc.properties.breakerParentId;
    if (!parentId) continue;
    const parent = breakerById.get(parentId);
    if (!parent) continue;

    const energized = isCoilEnergized(acc, potentials);
    if (energized && parent.state === 'on') {
      parent.state = 'tripped';
      faults.push({
        id: crypto.randomUUID(),
        type: 'trip',
        affectedComponentId: parent.id,
        message: `Shunt trip coil "${acc.label}" energized — breaker "${parent.label}" tripped.`,
        severity: 'warning',
        timestamp: wallMs,
      });
      anyTripped = true;
    }
  }

  // -----------------------------------------------------------------
  // Step 4: Motor operator kit — close or open based on command
  // -----------------------------------------------------------------
  for (const acc of accessories) {
    if (acc.type !== 'motor_operator_kit') continue;
    const parentId = acc.properties.breakerParentId;
    if (!parentId) continue;
    const parent = breakerById.get(parentId);
    if (!parent) continue;

    // If UVR on same breaker is de-energized, motor close is blocked
    const command = acc.properties.motorOperatorCommand ?? 'close';
    const energized = isMotorOperatorEnergized(acc, potentials);

    if (energized) {
      if (command === 'close' && (parent.state === 'off' || parent.state === 'tripped')) {
        if (!uvrDeenergizedBreakerIds.has(parentId)) {
          parent.state = 'on';
          anyTripped = true;
        }
      } else if (command === 'open' && parent.state === 'on') {
        parent.state = 'off';
        anyTripped = true;
      }
    }
  }

  return { anyTripped, faults };
}
