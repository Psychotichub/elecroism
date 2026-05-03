/**
 * Circuit simulation engine — slim coordinator.
 *
 * Delegates to focused sub-modules:
 *  - `threePhaseCalc`  — balanced/unbalanced 3φ math
 *  - `faultDetection`  — protection device trip logic
 *  - `terminalGraph`   — terminal connectivity graph builder
 *  - `potentials`      — potential propagation, supply detection, multimeter
 *  - `engineTypes`     — shared types and graph primitives
 */

import type {
  Circuit,
  SimulationResult,
  NodeResult,
  FaultEvent,
  CircuitComponent,
} from '../types';
import {
  validateContactorOverloadFaults,
  validateEthernetWires,
} from './wiringFaultValidation';
import { isSeriesProtectionTripType } from '../utils/seriesProtectionTripTypes';
import { isLoadComponent, isSeriesPathComponent } from './componentClassification';
import { terminalKey, bfsFrom, findTerminalByLabel } from './engineTypes';
import {
  buildTerminalGraph,
  computeContactorPickupFixpoint,
  mainBreakerBmsInterlockOpen,
} from './terminalGraph';
import {
  propagatePotentials,
  defaultSinglePhaseLoadVoltage,
  getDefaultThreePhaseLineVoltage,
  getAllLineConductorStartKeys,
  componentTouchesAnyPotential,
  hasPolarityCorrectSupply,
  indicatorLampSupplyTypeMatches,
  calculateCurrent,
  getLiveSideAnchorsOfLineNeutralCrossWires,
  getThreePhaseCrossPhaseAnchors,
  formatFaultAnchorLocations,
  getLoadLiveTerminalKey,
  singleSuppliedThreePhaseMotorCurrentA,
  shouldCheckMotorThermalNameplate,
  measureMultimeter,
  updateWireStates,
  updateMultimeterCurrentReadings,
} from './potentials';
import {
  loadUsesBalancedThreePhaseMath,
  loadUsesThreePhaseBranchReachability,
  hasExplicitPerPhasePower,
  phaseWattsAtLeg,
  readPhasePowerFactor,
  getPowerFactor,
  balancedThreePhaseLineCurrentA,
  mergeBalancedThreePhaseNodeResults,
} from './threePhaseCalc';
import { checkFaults } from './faultDetection';

export class CircuitEngine {
  /** Runtime ON-delay latch start time for timer relays. */
  private timerCoilEnergizedSinceMs = new Map<string, number>();

  simulate(circuit: Circuit, depth = 0, wallMs = Date.now()): SimulationResult {
    if (depth > 6) {
      return this.buildDegradedResult(circuit);
    }

    const contactorPickup = computeContactorPickupFixpoint(
      circuit,
      wallMs,
      propagatePotentials,
      this.timerCoilEnergizedSinceMs
    );
    const terminalGraph = buildTerminalGraph(circuit, null, contactorPickup);
    const potentials = propagatePotentials(circuit, terminalGraph);
    const nodes: Record<string, NodeResult> = {};
    const faults: FaultEvent[] = [];
    const defaultSingleVoltage = defaultSinglePhaseLoadVoltage(circuit);

    for (const component of circuit.components) {
      const isOpen =
        component.state === 'off' ||
        component.state === 'tripped' ||
        component.state === 'fault' ||
        mainBreakerBmsInterlockOpen(component);
      const hasPotential = componentTouchesAnyPotential(component, potentials);

      let energized = false;
      let currentA = 0;
      let voltageV = 0;
      let lineVoltageRmsV: number | undefined;
      let lineCurrentRmsA: number | undefined;
      let phaseVoltageRmsV: number | undefined;

      if (!isOpen) {
        if (isLoadComponent(component)) {
          energized = hasPolarityCorrectSupply(component, potentials);
          if (energized && component.type === 'indicator_lamp') {
            energized = indicatorLampSupplyTypeMatches(component, circuit, terminalGraph, potentials);
          }
          if (loadUsesBalancedThreePhaseMath(component)) {
            const serviceFactor = component.type === 'motor' ? 1.25 : 1;
            const r = balancedThreePhaseLineCurrentA(
              component, circuit, energized, serviceFactor, getDefaultThreePhaseLineVoltage
            );
            currentA = r.currentA;
            voltageV = r.voltageV;
            lineVoltageRmsV = r.vLL;
            lineCurrentRmsA = r.currentA;
            phaseVoltageRmsV = r.vPh;
          } else if (
            component.type === 'three_phase_motor' &&
            component.properties.phaseSystem === 'single_phase'
          ) {
            const r = singleSuppliedThreePhaseMotorCurrentA(component, defaultSingleVoltage, energized);
            currentA = r.currentA;
            voltageV = r.voltageV;
            phaseVoltageRmsV = r.phaseVoltageRmsV;
            lineVoltageRmsV = component.properties.lineVoltage;
          } else {
            currentA = energized ? calculateCurrent(component, defaultSingleVoltage) : 0;
            voltageV = energized ? defaultSingleVoltage : 0;
          }
        } else {
          if (component.type === 'multimeter') {
            const reading = measureMultimeter(component, circuit, potentials, terminalGraph);
            nodes[component.id] = {
              nodeId: component.id,
              voltageV: reading.voltageV,
              currentA: reading.currentA,
              powerW: reading.continuity ? 1 : 0,
              powerVA: 0,
              powerFactor: 1,
              energized: reading.connected,
            };
            (nodes[component.id] as NodeResult & { meterSignal?: 'ac' | 'dc' }).meterSignal = reading.signal;
            continue;
          }
          energized =
            hasPotential ||
            component.type === 'power_source' ||
            component.type === 'dc_power_source' ||
            component.type === 'three_phase_source';

          // Voltage assignment for non-load components
          if (component.type === 'three_phase_source') {
            const vLL = component.properties.lineVoltage || component.properties.voltage || 400;
            voltageV = energized ? vLL : 0;
            lineVoltageRmsV = vLL;
            phaseVoltageRmsV = vLL / Math.sqrt(3);
          } else if (
            component.type === 'three_phase_contactor' || component.type === 'four_phase_contactor' ||
            component.type === 'energy_meter' || component.type === 'digital_multifunction_meter'
          ) {
            const vLL = component.properties.lineVoltage || getDefaultThreePhaseLineVoltage(circuit);
            voltageV = energized ? vLL : 0;
            lineVoltageRmsV = vLL;
            phaseVoltageRmsV = vLL / Math.sqrt(3);
          } else if (component.type === 'power_source') {
            voltageV = energized ? (component.properties.voltage ?? 230) : 0;
          } else if (component.type === 'dc_power_source') {
            voltageV = energized ? (component.properties.voltage ?? 24) : 0;
          } else if (component.type === 'ac_dc_converter' || component.type === 'smps') {
            const acLcp = component.connectionPoints.find((cp) => cp.label.toUpperCase() === 'AC_L');
            const acNcp = component.connectionPoints.find((cp) => cp.label.toUpperCase() === 'AC_N');
            const acOk = !!acLcp && !!acNcp &&
              potentials.live.has(terminalKey(component.id, acLcp.id)) &&
              potentials.neutral.has(terminalKey(component.id, acNcp.id));
            energized = acOk;
            voltageV = acOk ? (component.properties.voltage ?? 24) : 0;
          } else if (component.type === 'control_transformer') {
            const pL = component.connectionPoints.find((cp) => cp.label.toUpperCase() === 'PRI_L');
            const pN = component.connectionPoints.find((cp) => cp.label.toUpperCase() === 'PRI_N');
            const priOk = !!pL && !!pN &&
              potentials.live.has(terminalKey(component.id, pL.id)) &&
              potentials.neutral.has(terminalKey(component.id, pN.id));
            energized = priOk;
            voltageV = priOk ? (component.properties.voltage ?? 24) : 0;
          } else {
            voltageV = energized ? defaultSingleVoltage : 0;
          }
        }
      }

      const pf = getPowerFactor(component);
      let powerVA: number;
      let powerW: number;
      let pfOut = pf;
      if (loadUsesBalancedThreePhaseMath(component) && hasExplicitPerPhasePower(component) && energized) {
        const p1 = phaseWattsAtLeg(component, 1);
        const p2 = phaseWattsAtLeg(component, 2);
        const p3 = phaseWattsAtLeg(component, 3);
        powerW = p1 + p2 + p3;
        const pf1 = readPhasePowerFactor(component, 1);
        const pf2 = readPhasePowerFactor(component, 2);
        const pf3 = readPhasePowerFactor(component, 3);
        powerVA = p1 / Math.max(pf1, 0.05) + p2 / Math.max(pf2, 0.05) + p3 / Math.max(pf3, 0.05);
        pfOut = powerVA > 1e-6 ? powerW / powerVA : pf;
      } else {
        powerVA = loadUsesBalancedThreePhaseMath(component)
          ? (voltageV || 0) * currentA * Math.sqrt(3)
          : voltageV * currentA;
        powerW = powerVA * pf;
      }

      const baseNode: NodeResult = {
        nodeId: component.id, voltageV, currentA, powerW, powerVA,
        powerFactor: pfOut, energized, lineVoltageRmsV, lineCurrentRmsA, phaseVoltageRmsV,
      };
      nodes[component.id] = mergeBalancedThreePhaseNodeResults(
        component, circuit, baseNode, getDefaultThreePhaseLineVoltage
      );
    }

    // Fault detection
    const lnFaultAnchors = getLiveSideAnchorsOfLineNeutralCrossWires(circuit, potentials);
    const phaseFaultAnchors = getThreePhaseCrossPhaseAnchors(potentials);
    const severeFaultAnchors = new Set<string>([...lnFaultAnchors, ...phaseFaultAnchors]);

    if (phaseFaultAnchors.size > 0) {
      const phaseFaultLocations = formatFaultAnchorLocations(circuit, phaseFaultAnchors, 3);
      faults.push({
        id: crypto.randomUUID(),
        type: 'short_circuit',
        affectedComponentId: circuit.components.find((c) => c.type === 'three_phase_source')?.id ?? circuit.components[0]?.id ?? '',
        message: `Three-phase short circuit: L1/L2/L3 are electrically tied together${phaseFaultLocations ? ` (at ${phaseFaultLocations})` : ''}.`,
        severity: 'critical',
        timestamp: wallMs,
      });
    }
    const prospectiveShortCurrentA = 5000;

    // Series path current computation
    const seriesPathCurrents = new Map<string, number>();
    for (const component of circuit.components) {
      if (!isSeriesPathComponent(component)) continue;
      if (component.state === 'off' || component.state === 'tripped') continue;
      let branchCurrent = this.getBranchCurrentThroughDevice(component, circuit, nodes, contactorPickup);
      if (severeFaultAnchors.size > 0 && this.seriesDeviceOnLivePathToLnFault(component, circuit, severeFaultAnchors, contactorPickup)) {
        branchCurrent = Math.max(branchCurrent, prospectiveShortCurrentA);
      }
      seriesPathCurrents.set(component.id, branchCurrent);
      if (nodes[component.id]) {
        const pf2 = getPowerFactor(component);
        const vRef = this.getSeriesDeviceVoltageRef(component, circuit, defaultSingleVoltage);
        const updated: NodeResult = {
          ...nodes[component.id],
          currentA: branchCurrent,
          powerVA: vRef * branchCurrent,
          powerW: vRef * branchCurrent * pf2,
        };
        nodes[component.id] = mergeBalancedThreePhaseNodeResults(component, circuit, updated, getDefaultThreePhaseLineVoltage);
      }
    }

    faults.push(...validateContactorOverloadFaults(circuit, seriesPathCurrents, contactorPickup, wallMs));

    // Protection device trip evaluation
    let anySeriesDeviceTripped = false;
    for (const component of circuit.components) {
      if (!isSeriesProtectionTripType(component.type)) continue;
      if (component.state === 'off' || component.state === 'tripped') continue;
      const branchCurrent = seriesPathCurrents.get(component.id) || 0;
      const lnFaultPath = severeFaultAnchors.size > 0 && this.seriesDeviceOnLivePathToLnFault(component, circuit, severeFaultAnchors, contactorPickup);
      const fault = checkFaults(component, branchCurrent, { lnFaultPath, wallMs });
      if (!fault) continue;
      faults.push(fault);
      component.state = 'tripped';
      anySeriesDeviceTripped = true;
      nodes[component.id] = {
        nodeId: component.id, voltageV: 0, currentA: 0, powerW: 0, powerVA: 0,
        powerFactor: getPowerFactor(component), energized: false,
      };
    }

    // Motor thermal nameplate check
    let anyMotorThermal = false;
    for (const component of circuit.components) {
      if (!shouldCheckMotorThermalNameplate(component)) continue;
      if (!nodes[component.id]?.energized) continue;
      const rated = component.properties.ratedLineAmps!;
      const iLine = nodes[component.id].currentA;
      if (iLine <= rated * 1.15) continue;
      const tag = component.type === 'motor' ? 'Motor' : 'Three-phase motor';
      faults.push({
        id: crypto.randomUUID(), type: 'overload', affectedComponentId: component.id,
        message: `${tag} "${component.label}" overload: ${iLine.toFixed(2)}A exceeds ${rated}A nameplate`,
        severity: 'critical', timestamp: Date.now(),
      });
      component.state = 'fault';
      anyMotorThermal = true;
      nodes[component.id] = {
        nodeId: component.id, voltageV: 0, currentA: 0, powerW: 0, powerVA: 0,
        powerFactor: getPowerFactor(component), energized: false,
      };
    }

    if (anySeriesDeviceTripped || anyMotorThermal) {
      const next = this.simulate(circuit, depth + 1, wallMs);
      return { ...next, faults: [...faults, ...next.faults] };
    }

    updateWireStates(circuit, nodes, potentials);
    faults.push(...validateEthernetWires(circuit, wallMs));
    updateMultimeterCurrentReadings(circuit, nodes);

    let totalPowerW = 0;
    let totalCurrentA = 0;
    for (const c of circuit.components) {
      const n = nodes[c.id];
      if (!n?.energized) continue;
      if (isLoadComponent(c)) {
        totalPowerW += n.powerW;
        totalCurrentA += n.currentA;
      }
    }

    return { success: true, nodes, faults, timestamp: wallMs, totalPowerW, totalCurrentA };
  }

  /**
   * Same terminal connectivity as simulation (contactor/timer pickup included),
   * for static design checks.
   */
  public getTerminalGraphForValidation(circuit: Circuit): Map<string, Set<string>> {
    const pickup = computeContactorPickupFixpoint(circuit, Date.now(), propagatePotentials, this.timerCoilEnergizedSinceMs);
    return buildTerminalGraph(circuit, null, pickup);
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                   */
  /* ------------------------------------------------------------------ */

  private buildDegradedResult(circuit: Circuit): SimulationResult {
    const nodes: Record<string, NodeResult> = {};
    for (const c of circuit.components) {
      nodes[c.id] = { nodeId: c.id, voltageV: 0, currentA: 0, powerW: 0, powerVA: 0, powerFactor: 1, energized: false };
    }
    return { success: true, nodes, faults: [], timestamp: Date.now(), totalPowerW: 0, totalCurrentA: 0 };
  }

  private getSeriesDeviceVoltageRef(component: CircuitComponent, circuit: Circuit, defaultSingle: number): number {
    const threePhaseTypes = new Set([
      'three_phase_mcb', 'four_phase_mcb', 'motorized_mccb', 'four_pole_motorized_mccb',
      'air_circuit_breaker', 'three_phase_contactor', 'four_phase_contactor',
      'energy_meter', 'digital_multifunction_meter',
    ]);
    return threePhaseTypes.has(component.type)
      ? component.properties.lineVoltage || getDefaultThreePhaseLineVoltage(circuit)
      : defaultSingle;
  }

  private getBranchCurrentThroughDevice(
    seriesDevice: CircuitComponent, circuit: Circuit,
    nodes: Record<string, NodeResult>, contactorPickup: Set<string>
  ): number {
    const graph = buildTerminalGraph(circuit, seriesDevice.id, contactorPickup);
    const lineStarts = getAllLineConductorStartKeys(circuit);
    const lineReach = bfsFrom(graph, lineStarts);

    let sum = 0;
    for (const comp of circuit.components) {
      if (!isLoadComponent(comp)) continue;
      const loadI = nodes[comp.id]?.currentA || 0;
      if (loadI <= 0) continue;
      if (loadUsesThreePhaseBranchReachability(comp)) {
        const k1 = findTerminalByLabel(comp, 'L1');
        const k2 = findTerminalByLabel(comp, 'L2');
        const k3 = findTerminalByLabel(comp, 'L3');
        if (!k1 || !k2 || !k3) continue;
        if (!(lineReach.has(k1) && lineReach.has(k2) && lineReach.has(k3))) sum += loadI;
        continue;
      }
      const liveKey = getLoadLiveTerminalKey(comp);
      if (!liveKey) continue;
      if (!lineReach.has(liveKey)) sum += loadI;
    }
    return sum;
  }

  private seriesDeviceOnLivePathToLnFault(
    seriesDevice: CircuitComponent, circuit: Circuit,
    faultLiveAnchors: Set<string>, contactorPickup: Set<string>
  ): boolean {
    if (faultLiveAnchors.size === 0) return false;
    const graphWithout = buildTerminalGraph(circuit, seriesDevice.id, contactorPickup);
    const liveStarts = getAllLineConductorStartKeys(circuit);
    const liveReach = bfsFrom(graphWithout, liveStarts);
    for (const key of faultLiveAnchors) {
      if (!liveReach.has(key)) return true;
    }
    return false;
  }
}

export const engine = new CircuitEngine();
