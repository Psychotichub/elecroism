/**
 * Selector switch (AUTO / OFF / MANUAL) control-circuit routing.
 *
 * - MANUAL: physical COM ↔ MAN bridge for panel push-buttons.
 * - AUTO (simple): COM ↔ AUTO bridge; coil fixpoint drives contactors.
 * - AUTO + ATS controller: COM ↔ AUTO energizes the auto bus; BMS/ATS
 *   `forcedContactorPickup` overrides which contactor main poles close.
 */

import type { Circuit, CircuitComponent } from '../types';
import type { CircuitValidationIssue } from '../utils/circuitDesignValidation';
import type { SimulateOverrides } from './simulateOverrides';
import {
  applyAtsPhaseToCircuit,
  getAtsPhaseAtTime,
  resolveAtsConfig,
} from './atsTransferSequence';

export type SelectorRoutingMode =
  | 'off_isolated'
  | 'manual_physical'
  | 'auto_simple'
  | 'auto_bms_override';

const SELECTOR_BRIDGE_PAIRS: Record<'AUTO' | 'MANUAL', [string, string]> = {
  AUTO: ['COM', 'AUTO'],
  MANUAL: ['COM', 'MAN'],
};

export function selectorRoutingMode(
  component: CircuitComponent
): SelectorRoutingMode {
  if (component.type !== 'selector_switch') return 'off_isolated';
  const pos = component.properties.selectorPosition ?? 'OFF';
  if (pos === 'OFF') return 'off_isolated';
  if (pos === 'MANUAL') return 'manual_physical';
  if (component.properties.atsController) return 'auto_bms_override';
  return 'auto_simple';
}

/** Internal pole pairs to bridge for the current selector position. */
export function selectorSwitchBridgePairs(
  component: CircuitComponent
): [string, string][] {
  if (component.type !== 'selector_switch') return [];
  const pos = component.properties.selectorPosition ?? 'OFF';
  if (pos === 'AUTO' || pos === 'MANUAL') {
    return [SELECTOR_BRIDGE_PAIRS[pos]];
  }
  return [];
}

export function usesAtsBmsContactorOverride(circuit: Circuit): boolean {
  const config = resolveAtsConfig(circuit);
  if (!config) return false;
  const controller = circuit.components.find((c) => c.id === config.controllerId);
  return (
    controller?.properties.selectorPosition === 'AUTO' &&
    Boolean(controller.properties.atsController)
  );
}

/**
 * Merge ATS/BMS contactor overrides when the selector is in AUTO.
 * MANUAL and OFF leave coil fixpoint / physical wiring in control.
 */
export function mergeAtsSimulateOverrides(
  circuit: Circuit,
  atsSequenceTimeMs: number,
  base?: SimulateOverrides
): SimulateOverrides | undefined {
  if (base?.forcedContactorPickup?.size) return base;

  const config = resolveAtsConfig(circuit);
  if (!config) return base;

  const controller = circuit.components.find((c) => c.id === config.controllerId);
  if (!controller) return base;

  const pos = controller.properties.selectorPosition ?? 'OFF';
  if (pos !== 'AUTO') return base;

  const phase = getAtsPhaseAtTime(config, atsSequenceTimeMs);
  const atsOverrides = applyAtsPhaseToCircuit(circuit, config, phase);

  const forced = new Map<string, boolean>();
  for (const [id, on] of atsOverrides.forcedContactorPickup ?? []) {
    forced.set(id, on);
  }

  return {
    ...base,
    atsSequenceTimeMs,
    forcedContactorPickup: forced,
  };
}

export function validateSelectorSwitchRouting(
  circuit: Circuit
): CircuitValidationIssue[] {
  const issues: CircuitValidationIssue[] = [];

  for (const c of circuit.components) {
    if (c.type !== 'selector_switch') continue;
    const mode = selectorRoutingMode(c);
    const pos = c.properties.selectorPosition ?? 'OFF';

    if (mode === 'manual_physical' && c.properties.atsController) {
      issues.push({
        id: `selector-manual-ats-${c.id}`,
        severity: 'info',
        message: `"${c.label}" is MANUAL — ATS/BMS overrides are disabled; wire push-buttons on COM ↔ MAN.`,
        componentIds: [c.id],
      });
    }

    if (mode === 'auto_bms_override') {
      issues.push({
        id: `selector-auto-bms-${c.id}`,
        severity: 'info',
        message: `"${c.label}" AUTO: COM ↔ AUTO energizes the auto bus; ATS/BMS DI/DO overrides contactor pickup (not the MAN branch).`,
        componentIds: [c.id],
      });
    }

    if (mode === 'auto_simple' && pos === 'AUTO') {
      issues.push({
        id: `selector-auto-simple-${c.id}`,
        severity: 'info',
        message: `"${c.label}" AUTO: COM ↔ AUTO bridged — coil fixpoint closes contactors on the auto control path.`,
        componentIds: [c.id],
      });
    }

    if (pos === 'OFF') {
      issues.push({
        id: `selector-off-${c.id}`,
        severity: 'info',
        message: `"${c.label}" OFF: both AUTO and MAN branches isolated from COM.`,
        componentIds: [c.id],
      });
    }
  }

  return issues;
}
