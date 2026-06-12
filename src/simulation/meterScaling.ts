import type { Circuit, CircuitComponent, NodeResult } from '../types';
import { bfsFrom, findTerminalByLabel } from './engineTypes';

/**
 * Finds if a current transformer is connected to a specific phase of the meter.
 * Checks if the CT secondary terminals SEC_S1 / SEC_S2 are in the reachability set of
 * the meter's phase terminals.
 */
function findConnectedCtForPhase(
  meterId: string,
  termIn: string,
  termOut: string,
  circuit: Circuit,
  terminalGraph: Map<string, Set<string>>
): CircuitComponent | null {
  const meter = circuit.components.find((c) => c.id === meterId);
  if (!meter) return null;
  const inKey = findTerminalByLabel(meter, termIn);
  const outKey = findTerminalByLabel(meter, termOut);
  if (!inKey && !outKey) return null;

  const starts = [inKey, outKey].filter((k): k is string => k !== null);
  const reach = bfsFrom(terminalGraph, starts);

  for (const c of circuit.components) {
    if (c.type !== 'current_transformer') continue;
    const s1 = findTerminalByLabel(c, 'SEC_S1');
    const s2 = findTerminalByLabel(c, 'SEC_S2');
    if ((s1 && reach.has(s1)) || (s2 && reach.has(s2))) {
      return c;
    }
  }
  return null;
}

/**
 * Finds if a voltage transformer is connected to the meter.
 * Checks if VT secondary terminals SEC_L / SEC_N are in the reachability set of the
 * meter's voltage input terminals.
 */
export function findConnectedVt(
  meterId: string,
  circuit: Circuit,
  terminalGraph: Map<string, Set<string>>
): CircuitComponent | null {
  const meter = circuit.components.find((c) => c.id === meterId);
  if (!meter) return null;
  const l1Key = findTerminalByLabel(meter, '1');
  const nKey = findTerminalByLabel(meter, '7');
  if (!l1Key && !nKey) return null;

  const starts = [l1Key, nKey].filter((k): k is string => k !== null);
  const reach = bfsFrom(terminalGraph, starts);

  for (const c of circuit.components) {
    if (c.type !== 'voltage_transformer') continue;
    const secL = findTerminalByLabel(c, 'SEC_L');
    const secN = findTerminalByLabel(c, 'SEC_N');
    if ((secL && reach.has(secL)) || (secN && reach.has(secN))) {
      return c;
    }
  }
  return null;
}

/**
 * Applies CT and VT scaling onto the NodeResults of energy meters, multifunction meters,
 * and power quality analyzers.
 */
export function applyMeterScaling(
  circuit: Circuit,
  nodes: Record<string, NodeResult>,
  terminalGraph: Map<string, Set<string>>
): void {
  for (const meter of circuit.components) {
    if (
      meter.type !== 'energy_meter' &&
      meter.type !== 'digital_multifunction_meter' &&
      meter.type !== 'power_quality_analyzer'
    ) {
      continue;
    }

    const node = nodes[meter.id];
    if (!node || !node.energized) continue;

    // 1. Calculate CT ratio per phase
    const isCtMode = meter.properties.meterConnectionMode === 'ct';
    const ctL1 = findConnectedCtForPhase(meter.id, '1', '2', circuit, terminalGraph);
    const ctL2 = findConnectedCtForPhase(meter.id, '3', '4', circuit, terminalGraph);
    const ctL3 = findConnectedCtForPhase(meter.id, '5', '6', circuit, terminalGraph);

    const ctRatioL1 = isCtMode && ctL1 ? (ctL1.properties.meterCtPrimary ?? 100) / 5 : 1;
    const ctRatioL2 = isCtMode && ctL2 ? (ctL2.properties.meterCtPrimary ?? 100) / 5 : 1;
    const ctRatioL3 = isCtMode && ctL3 ? (ctL3.properties.meterCtPrimary ?? 100) / 5 : 1;

    // Apply CT scaling to currents
    const currentL1 = (node.currentL1A ?? node.currentA ?? 0) * ctRatioL1;
    const currentL2 = (node.currentL2A ?? node.currentA ?? 0) * ctRatioL2;
    const currentL3 = (node.currentL3A ?? node.currentA ?? 0) * ctRatioL3;
    const currentNeutral = (node.currentNeutralA ?? 0) * ctRatioL1;

    // 2. Calculate VT ratio
    const vt = findConnectedVt(meter.id, circuit, terminalGraph);
    let vtRatio = 1;
    if (vt) {
      const vtPrimary = vt.properties.phaseVoltage ?? 230;
      const vtSecondary = vt.properties.voltage ?? 110;
      vtRatio = vtPrimary / vtSecondary;
    } else if (meter.properties.meterVtEnabled) {
      const vtPrimary = meter.properties.meterVtPrimary ?? 400;
      const vtSecondary = meter.properties.meterVtSecondary ?? 110;
      vtRatio = vtPrimary / vtSecondary;
    }

    // Apply VT scaling to voltages
    const voltageV = node.voltageV * vtRatio;
    const lineVoltageRmsV = (node.lineVoltageRmsV ?? 0) * vtRatio;
    const phaseVoltageRmsV = (node.phaseVoltageRmsV ?? 0) * vtRatio;

    const voltageL1N = (node.voltageL1NV ?? 0) * vtRatio;
    const voltageL2N = (node.voltageL2NV ?? 0) * vtRatio;
    const voltageL3N = (node.voltageL3NV ?? 0) * vtRatio;

    const voltageL1L2 = (node.voltageL1L2V ?? 0) * vtRatio;
    const voltageL2L3 = (node.voltageL2L3V ?? 0) * vtRatio;
    const voltageL3L1 = (node.voltageL3L1V ?? 0) * vtRatio;

    // 3. Re-calculate average current and power values
    const is3P = meter.properties.phaseSystem === 'three_phase';
    const averageCurrent = is3P ? (currentL1 + currentL2 + currentL3) / 3 : currentL1;

    const powerVA = is3P
      ? lineVoltageRmsV * averageCurrent * Math.sqrt(3)
      : voltageV * averageCurrent;
    const powerW = powerVA * (node.powerFactor ?? 1);

    // 4. Update the NodeResult in-place with scaled-up display values
    nodes[meter.id] = {
      ...node,
      voltageV,
      currentA: averageCurrent,
      lineCurrentRmsA: averageCurrent,
      lineVoltageRmsV,
      phaseVoltageRmsV,
      powerVA,
      powerW,

      // Per-phase currents
      currentL1A: currentL1,
      currentL2A: currentL2,
      currentL3A: currentL3,
      currentNeutralA: currentNeutral,

      // Per-phase voltages
      voltageL1NV: voltageL1N,
      voltageL2NV: voltageL2N,
      voltageL3NV: voltageL3N,

      // Line-to-line voltages
      voltageL1L2V: voltageL1L2,
      voltageL2L3V: voltageL2L3,
      voltageL3L1V: voltageL3L1,
    };
  }
}
