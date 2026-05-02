import type { Circuit, CircuitComponent, WireStyleLayer } from '../types';

export type WireConnectionSeverity = 'ok' | 'warning' | 'blocked';

export type WireConnectionCheck = {
  allowed: boolean;
  severity: WireConnectionSeverity;
  message?: string;
};

const OK: WireConnectionCheck = { allowed: true, severity: 'ok' };

function blocked(message: string): WireConnectionCheck {
  return { allowed: false, severity: 'blocked', message };
}

function warning(message: string): WireConnectionCheck {
  return { allowed: true, severity: 'warning', message };
}

function worst(a: WireConnectionCheck, b: WireConnectionCheck): WireConnectionCheck {
  const r = { ok: 0, warning: 1, blocked: 2 };
  return r[a.severity] >= r[b.severity] ? a : b;
}

function norm(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toUpperCase();
}

function isPeLabel(label: string): boolean {
  return /\b(PE|EARTH|GROUND)\b/i.test(label);
}

function isNeutralLabel(label: string): boolean {
  const u = norm(label);
  if (u === 'N') return true;
  return /\b(IN_N|OUT_N|AC_N|NEUTRAL|N_OUT)\b/.test(u);
}

/** Unswitched mains / line conductor (not neutral, not PE). */
function isAcLiveLabel(label: string): boolean {
  if (isPeLabel(label) || isNeutralLabel(label)) return false;
  const u = norm(label);
  if (/\b(L1|L2|L3|IN_L|OUT_L|AC_L|LINE|PHASE)\b/.test(u)) return true;
  if (/\b(IN|OUT)\b/.test(u) && /\bL\b/.test(u) && !/LED|AUX|COM/i.test(label)) {
    return true;
  }
  return false;
}

function isCommLabel(label: string): boolean {
  const u = norm(label);
  if (
    /\b(RJ45|ETHERNET|ETH|LAN|RS485|RS232|BACNET|MODBUS_TCP|MODBUS|MB_TCP)\b/i.test(
      u
    )
  ) {
    return true;
  }
  if (/\b(DI_|DO_|AI_|AO_|MB_)\d*\b/i.test(u)) return true;
  return /\b(TX|RX)\b/i.test(u) && /\b(RS|ETH|LAN)\b/i.test(u);
}

function phaseToken(label: string): 'L1' | 'L2' | 'L3' | null {
  const u = norm(label);
  if (/\bL1\b/.test(u) || /\bIN_L1\b/.test(u) || /\bOUT_L1\b/.test(u)) return 'L1';
  if (/\bL2\b/.test(u) || /\bIN_L2\b/.test(u) || /\bOUT_L2\b/.test(u)) return 'L2';
  if (/\bL3\b/.test(u) || /\bIN_L3\b/.test(u) || /\bOUT_L3\b/.test(u)) return 'L3';
  return null;
}

function isOutputLikeLabel(label: string): boolean {
  return /\b(OUT_|OUTPUT)\b/i.test(label) || /^OUT$/i.test(label.trim());
}

const COMM_COMPONENT_TYPES = new Set<CircuitComponent['type']>([
  'modbus_tcp_gateway',
  'bacnet_ip_gateway',
  'modbus_rtu_module',
  'ethernet_switch',
  'communication_converter',
  'iot_gateway',
  'cloud_monitoring_module',
  'di_module',
  'do_module',
  'ai_module',
  'ao_module',
  'relay_interface_card',
  'energy_management_controller',
]);

const POWER_COMPONENT_TYPES = new Set<CircuitComponent['type']>([
  'power_source',
  'three_phase_source',
  'socket',
  'mcb',
  'three_phase_mcb',
  'four_phase_mcb',
  'mccb',
  'motorized_mccb',
  'four_pole_motorized_mccb',
  'hrc_fuse',
  'rcd',
  'residual_current_circuit_breaker',
  'earth_leakage_relay_cbct',
  'control_circuit_fuse',
  'busbar',
  'busbar_system',
  'air_circuit_breaker',
  'ac_dc_converter',
  'smps',
  'dc_power_source',
  'lamp',
  'motor',
  'heater',
  'panel_heater',
  'cooling_fan',
  'generic_load',
]);

function rulePeToLive(
  fromLabel: string,
  toLabel: string
): WireConnectionCheck {
  const peA = isPeLabel(fromLabel);
  const peB = isPeLabel(toLabel);
  const liveA = isAcLiveLabel(fromLabel);
  const liveB = isAcLiveLabel(toLabel);
  if ((peA && liveB && !peB) || (peB && liveA && !peA)) {
    return blocked('PE must not be joined directly to a live AC conductor.');
  }
  return OK;
}

function ruleCommToAcMains(
  fromLabel: string,
  toLabel: string
): WireConnectionCheck {
  const cFrom = isCommLabel(fromLabel);
  const cTo = isCommLabel(toLabel);
  if (!cFrom && !cTo) return OK;
  if (cFrom && cTo) return OK;

  const otherIsAcMains = (lab: string) =>
    isAcLiveLabel(lab) ||
    isNeutralLabel(lab) ||
    /\b(AC_|230|400V|MAINS)\b/i.test(lab);

  if (cFrom && otherIsAcMains(toLabel) && !isPeLabel(toLabel)) {
    return blocked('Communication terminal must not tie to AC mains.');
  }
  if (cTo && otherIsAcMains(fromLabel) && !isPeLabel(fromLabel)) {
    return blocked('Communication terminal must not tie to AC mains.');
  }
  return OK;
}

/** Same device: different phase taps (e.g. L1↔L2) are a bolted fault. */
function ruleSameDeviceCrossPhase(
  fromComp: CircuitComponent,
  toComp: CircuitComponent,
  fromLabel: string,
  toLabel: string
): WireConnectionCheck {
  if (fromComp.id !== toComp.id) return OK;
  const p1 = phaseToken(fromLabel);
  const p2 = phaseToken(toLabel);
  if (p1 && p2 && p1 !== p2) {
    return blocked(`Same device: ${p1} must not tie directly to ${p2}.`);
  }
  return OK;
}

function ruleOutputToOutput(
  fromComp: CircuitComponent,
  toComp: CircuitComponent,
  fromLabel: string,
  toLabel: string
): WireConnectionCheck {
  if (!isOutputLikeLabel(fromLabel) || !isOutputLikeLabel(toLabel)) return OK;
  if (fromComp.id === toComp.id) return OK;
  return warning('Output to output — verify this is intentional (no upstream protection).');
}

function rulePowerComponentToCommComponent(
  fromComp: CircuitComponent,
  toComp: CircuitComponent
): WireConnectionCheck {
  const aPow = POWER_COMPONENT_TYPES.has(fromComp.type);
  const bPow = POWER_COMPONENT_TYPES.has(toComp.type);
  const aComm = COMM_COMPONENT_TYPES.has(fromComp.type);
  const bComm = COMM_COMPONENT_TYPES.has(toComp.type);
  if ((aPow && bComm) || (bPow && aComm)) {
    return warning('Power circuit meets communication hardware — check segregation / SELV.');
  }
  return OK;
}

/** Same device: line tap to neutral tap can be an unintended strap. */
function ruleLiveToNeutral(
  fromComp: CircuitComponent,
  toComp: CircuitComponent,
  fromLabel: string,
  toLabel: string
): WireConnectionCheck {
  if (fromComp.id !== toComp.id) return OK;
  const liveA = isAcLiveLabel(fromLabel);
  const liveB = isAcLiveLabel(toLabel);
  const nA = isNeutralLabel(fromLabel);
  const nB = isNeutralLabel(toLabel);
  if ((liveA && nB && !nA && !liveB) || (liveB && nA && !nB && !liveA)) {
    return warning('Line to neutral on the same device — confirm intent.');
  }
  return OK;
}

function ruleStyleLayerVsTerminals(
  fromLabel: string,
  toLabel: string,
  styleLayer: WireStyleLayer | null | undefined
): WireConnectionCheck {
  if (!styleLayer) return OK;
  if (styleLayer === 'earth_pe') {
    if (!isPeLabel(fromLabel) && !isPeLabel(toLabel)) {
      return warning(
        'Earth/PE style layer: neither terminal label looks like PE/earth.'
      );
    }
  }
  if (styleLayer === 'neutral') {
    if (!isNeutralLabel(fromLabel) && !isNeutralLabel(toLabel)) {
      return warning(
        'Neutral style layer: terminal labels may not be neutral — confirm conductor identity.'
      );
    }
  }
  if (styleLayer === 'communication') {
    if (!isCommLabel(fromLabel) && !isCommLabel(toLabel)) {
      return warning(
        'Communication style layer: terminals do not look like comm ports — verify cable type.'
      );
    }
  }
  if (styleLayer === 'power_dc') {
    if (isAcLiveLabel(fromLabel) && isAcLiveLabel(toLabel)) {
      return warning(
        'Power DC layer between two AC-line-style terminals — verify polarity/system.'
      );
    }
  }
  return OK;
}

/**
 * Electrical sanity checks before committing a wire between two terminals.
 * `allowed: false` + `severity: 'blocked'` stops `finishWire`; warnings still allow.
 */
export function checkWireConnection(
  circuit: Circuit,
  fromComponentId: string,
  fromPointId: string,
  toComponentId: string,
  toPointId: string,
  opts?: { styleLayer?: WireStyleLayer | null }
): WireConnectionCheck {
  const fromComp = circuit.components.find((c) => c.id === fromComponentId);
  const toComp = circuit.components.find((c) => c.id === toComponentId);
  if (!fromComp || !toComp) return OK;

  const fromPt = fromComp.connectionPoints.find((p) => p.id === fromPointId);
  const toPt = toComp.connectionPoints.find((p) => p.id === toPointId);
  if (!fromPt || !toPt) return OK;

  const fromLabel = fromPt.label ?? '';
  const toLabel = toPt.label ?? '';

  let acc: WireConnectionCheck = OK;
  acc = worst(acc, rulePeToLive(fromLabel, toLabel));
  acc = worst(acc, ruleCommToAcMains(fromLabel, toLabel));
  acc = worst(acc, ruleSameDeviceCrossPhase(fromComp, toComp, fromLabel, toLabel));
  acc = worst(acc, ruleOutputToOutput(fromComp, toComp, fromLabel, toLabel));
  acc = worst(acc, rulePowerComponentToCommComponent(fromComp, toComp));
  acc = worst(acc, ruleLiveToNeutral(fromComp, toComp, fromLabel, toLabel));
  acc = worst(acc, ruleStyleLayerVsTerminals(fromLabel, toLabel, opts?.styleLayer));

  return acc;
}
