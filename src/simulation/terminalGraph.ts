/**
 * Terminal graph builder.
 *
 * Constructs the undirected connectivity graph that models how terminals
 * are wired together and how internal component bridges create paths
 * through switches, breakers, contactors, etc.
 * Also handles contactor/timer coil pickup fixpoint iteration.
 *
 * Extracted from the monolithic `engine.ts`.
 */

import type { Circuit, CircuitComponent } from '../types';
import type { TerminalGraphCache } from './terminalGraphCache';
import {
  addEdge,
  connectAll,
  findTerminalByLabel,
  bridgeLabelPairs,
  bridgeAuxContacts,
  terminalKey,
  type PotentialSets,
  linePotentialAt,
} from './engineTypes';
import { mcbLayoutPoles } from '../store/circuitConnectionGeometry';
import {
  applyPluginInternalBridges,
  pluginSimConfigFromComponent,
} from './pluginSimulation';
import {
  BRIDGE_PAIRS_1P,
  BRIDGE_PAIRS_2P_LN,
  BRIDGE_PAIRS_3P_LLL,
  BRIDGE_PAIRS_4P_LLLN,
  BRIDGE_PAIRS_SINGLE_CONT,
  BRIDGE_PAIRS_T_POWER_3P,
  BRIDGE_PAIRS_T_POWER_4P,
} from '../utils/terminalBridgeAliases';
import { selectorSwitchBridgePairs } from './selectorSwitchRouting';
import {
  computeSmartRelayOutputs,
  unionPickupSets,
} from './smartRelayLogic';

/* ------------------------------------------------------------------ */
/*  Component classification helpers                                  */
/* ------------------------------------------------------------------ */

export function isCoilActuatedContactorType(type: string): boolean {
  return (
    type === 'contactor' ||
    type === 'relay' ||
    type === 'smart_relay' ||
    type === 'timer' ||
    type === 'three_phase_contactor' ||
    type === 'four_phase_contactor' ||
    // Interposing (interface) relay: 24 V DC coil drives a single dry NO.
    type === 'interposing_relay'
  );
}

/**
 * NO: closed while pressed. NC: closed while not pressed.
 * If `pressed` is absent (older saves), fall back to latched `state === 'on'`.
 */
export function pushButtonConducting(c: CircuitComponent): boolean {
  if (c.type !== 'push_button') return false;
  const nc = c.properties.buttonType === 'NC';
  const pb = c as CircuitComponent & { pressed?: boolean };
  if (pb.pressed !== undefined) {
    const p = !!pb.pressed;
    return nc ? !p : p;
  }
  // Legacy saves without `pressed`: NC rests closed; NO used latched state.
  return nc ? true : c.state === 'on';
}

/** ACB: UVR de-energized opens main contacts. mMCCB: loss of control supply only. */
export function mainBreakerBmsInterlockOpen(component: CircuitComponent): boolean {
  if (component.type === 'air_circuit_breaker') {
    const p = component.properties;
    return Boolean(p.acbBmsEnabled && p.acbBmsUvrEnergized === false);
  }
  if (
    component.type === 'motorized_mccb' ||
    component.type === 'four_pole_motorized_mccb'
  ) {
    const p = component.properties;
    return Boolean(p.mccbBmsEnabled && p.mccbBmsCtrlVoltageOk === false);
  }
  return false;
}

/* ------------------------------------------------------------------ */
/*  Coil pickup helpers                                               */
/* ------------------------------------------------------------------ */

/**
 * Coil picked up when A1 and A2 (or legacy COIL_A/B) sit on line and neutral
 * networks (either polarity).
 */
function coilHasOperatingVoltage(
  component: CircuitComponent,
  potentials: PotentialSets
): boolean {
  const k1 =
    findTerminalByLabel(component, 'A1') ||
    findTerminalByLabel(component, 'COIL_A');
  const k2 =
    findTerminalByLabel(component, 'A2') ||
    findTerminalByLabel(component, 'COIL_B');
  if (!k1 || !k2) return false;
  const t1Live = linePotentialAt(potentials, k1);
  const t1N = potentials.neutral.has(k1);
  const t2Live = linePotentialAt(potentials, k2);
  const t2N = potentials.neutral.has(k2);
  return (t1Live && t2N) || (t1N && t2Live);
}

function pickupSetsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/*  Terminal graph builder                                            */
/* ------------------------------------------------------------------ */

/** Wire connectivity only — cached across edits that do not change topology. */
export function buildWireSkeletonGraph(circuit: Circuit): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  for (const component of circuit.components) {
    for (const cp of component.connectionPoints) {
      const key = terminalKey(component.id, cp.id);
      if (!graph.has(key)) graph.set(key, new Set());
    }
  }

  for (const wire of circuit.wires) {
    const fromKey = terminalKey(wire.fromComponentId, wire.fromPointId);
    const toKey = terminalKey(wire.toComponentId, wire.toPointId);
    if (graph.has(fromKey) && graph.has(toKey)) {
      addEdge(graph, fromKey, toKey);
    }
  }

  return graph;
}

/**
 * Apply device-internal bridges (switch poles, contactor contacts, etc.).
 * @param onlyComponentIds When set, refresh bridges for these components only.
 */
export function applyInternalBridges(
  graph: Map<string, Set<string>>,
  circuit: Circuit,
  omitInternalConnectionForComponentId?: string | null,
  contactorPickupSet?: Set<string> | null,
  onlyComponentIds?: ReadonlySet<string> | null
): void {
  for (const component of circuit.components) {
    if (onlyComponentIds && !onlyComponentIds.has(component.id)) continue;
    const keys = component.connectionPoints.map((cp) =>
      terminalKey(component.id, cp.id)
    );
    if (keys.length < 2) continue;

    const skipInternalBridge =
      omitInternalConnectionForComponentId === component.id;

    switch (component.type) {
      case 'busbar':
      case 'busbar_system':
      case 'neutral_bar_system':
      case 'earth_bar_grounding_system':
      case 'junction':
      case 'connection_point':
        connectAll(graph, keys);
        break;
      case 'terminal_block':
        if (!skipInternalBridge) {
          bridgeLabelPairs(graph, component, BRIDGE_PAIRS_1P);
        }
        break;
      case 'push_button':
        if (pushButtonConducting(component) && !skipInternalBridge) {
          bridgeLabelPairs(graph, component, BRIDGE_PAIRS_1P);
        }
        break;
      case 'switch':
      case 'door_interlock':
      case 'key_interlock':
      case 'hrc_fuse':
      case 'overload_relay':
        if (component.state === 'on' && !skipInternalBridge) {
          if (component.type === 'hrc_fuse') {
            bridgeLabelPairs(graph, component, [
              ...BRIDGE_PAIRS_1P,
              ...BRIDGE_PAIRS_3P_LLL,
            ]);
          } else {
            bridgeLabelPairs(graph, component, BRIDGE_PAIRS_1P);
          }
        }
        break;
      case 'two_way_switch': {
        if (skipInternalBridge) break;
        const com = findTerminalByLabel(component, 'COM');
        const t1 = findTerminalByLabel(component, 'T1');
        const t2 = findTerminalByLabel(component, 'T2');
        if (!com || !t1 || !t2) break;
        if (component.state === 'on') {
          addEdge(graph, com, t1);
        } else {
          addEdge(graph, com, t2);
        }
        break;
      }
      case 'mechanical_interlock':
        if (component.state !== 'on' && !skipInternalBridge) {
          bridgeLabelPairs(graph, component, BRIDGE_PAIRS_1P);
        }
        break;
      case 'rcd':
      case 'residual_current_circuit_breaker':
        if (component.state === 'on' && !skipInternalBridge) {
          bridgeLabelPairs(graph, component, [
            ...BRIDGE_PAIRS_1P,
            ...BRIDGE_PAIRS_2P_LN,
            ...BRIDGE_PAIRS_4P_LLLN,
          ]);
        }
        break;
      case 'earth_leakage_relay_cbct':
        if (component.state === 'on' && !skipInternalBridge) {
          bridgeLabelPairs(graph, component, [
            ...BRIDGE_PAIRS_1P,
            ...BRIDGE_PAIRS_3P_LLL,
          ]);
        }
        break;
      case 'control_circuit_fuse':
        if (component.state === 'on' && !skipInternalBridge) {
          bridgeLabelPairs(graph, component, BRIDGE_PAIRS_1P);
        }
        break;
      case 'mcb':
        if (component.state === 'on' && !skipInternalBridge) {
          const pairs =
            mcbLayoutPoles(component) === 2
              ? BRIDGE_PAIRS_2P_LN
              : BRIDGE_PAIRS_1P;
          bridgeLabelPairs(graph, component, pairs);
        }
        break;
      case 'contactor':
      case 'relay':
        if (!skipInternalBridge && contactorPickupSet) {
          const pickedUp = contactorPickupSet.has(component.id);
          if (pickedUp) {
            bridgeLabelPairs(graph, component, BRIDGE_PAIRS_SINGLE_CONT);
          }
          bridgeAuxContacts(graph, component, pickedUp);
        }
        break;
      case 'smart_relay':
        if (!skipInternalBridge && contactorPickupSet?.has(component.id)) {
          bridgeLabelPairs(graph, component, BRIDGE_PAIRS_SINGLE_CONT);
        }
        break;
      case 'timer':
        if (!skipInternalBridge && contactorPickupSet) {
          const pickedUp = contactorPickupSet.has(component.id);
          const com = findTerminalByLabel(component, 'COM');
          const no = findTerminalByLabel(component, 'NO');
          const nc = findTerminalByLabel(component, 'NC');
          if (com && no && pickedUp) addEdge(graph, com, no);
          if (com && nc && !pickedUp) addEdge(graph, com, nc);
        }
        break;
      case 'interposing_relay':
        if (!skipInternalBridge && contactorPickupSet) {
          const pickedUp = contactorPickupSet.has(component.id);
          if (pickedUp) {
            bridgeLabelPairs(graph, component, BRIDGE_PAIRS_SINGLE_CONT);
          }
        }
        break;
      case 'aux_contact_block': {
        if (!skipInternalBridge) {
          const noIn = findTerminalByLabel(component, '13');
          const noOut = findTerminalByLabel(component, '14');
          const ncIn = findTerminalByLabel(component, '21');
          const ncOut = findTerminalByLabel(component, '22');
          const followId =
            component.properties.auxContactFollowContactorId?.trim() || '';
          const noPairClosed =
            followId && contactorPickupSet
              ? contactorPickupSet.has(followId)
              : component.state === 'on';
          if (noPairClosed) {
            if (noIn && noOut) addEdge(graph, noIn, noOut);
          } else {
            if (ncIn && ncOut) addEdge(graph, ncIn, ncOut);
          }
        }
        break;
      }
      case 'estop':
        if (component.state === 'on' && !skipInternalBridge) {
          bridgeLabelPairs(graph, component, BRIDGE_PAIRS_1P);
        }
        break;
      case 'selector_switch': {
        if (skipInternalBridge) break;
        const pairs = selectorSwitchBridgePairs(component);
        if (pairs.length > 0) {
          bridgeLabelPairs(graph, component, pairs);
        }
        break;
      }
      case 'energy_meter':
        if (!skipInternalBridge) {
          bridgeLabelPairs(graph, component, BRIDGE_PAIRS_4P_LLLN);
        }
        break;
      case 'digital_multifunction_meter':
        if (!skipInternalBridge && component.state === 'on') {
          bridgeLabelPairs(graph, component, BRIDGE_PAIRS_4P_LLLN);
        }
        break;
      case 'signal_isolator':
        if (!skipInternalBridge) {
          const pairs: [string, string][] = [
            ['ANALOG_IN_POS', 'ANALOG_OUT_POS'],
            ['ANALOG_IN_NEG', 'ANALOG_OUT_NEG'],
          ];
          for (const [a, b] of pairs) {
            const ak = findTerminalByLabel(component, a);
            const bk = findTerminalByLabel(component, b);
            if (ak && bk) addEdge(graph, ak, bk);
          }
        }
        break;
      case 'optocoupler_module':
        if (!skipInternalBridge && component.state === 'on') {
          const pairs: [string, string][] = [
            ['IN_CH1_POS', 'DRY_OUT_CH1_POS'],
            ['IN_CH1_NEG', 'DRY_OUT_CH1_NEG'],
          ];
          for (const [a, b] of pairs) {
            const ak = findTerminalByLabel(component, a);
            const bk = findTerminalByLabel(component, b);
            if (ak && bk) addEdge(graph, ak, bk);
          }
        }
        break;
      case 'ups_module':
        if (!skipInternalBridge && component.state === 'on') {
          const pairs: [string, string][] = [
            ['AC_IN_L', 'AC_OUT_L'],
            ['AC_IN_N', 'AC_OUT_N'],
          ];
          for (const [a, b] of pairs) {
            const ak = findTerminalByLabel(component, a);
            const bk = findTerminalByLabel(component, b);
            if (ak && bk) addEdge(graph, ak, bk);
          }
        }
        break;
      case 'neutral_link':
        if (!skipInternalBridge) {
          const a = findTerminalByLabel(component, 'N_IN');
          const b = findTerminalByLabel(component, 'N_OUT');
          if (a && b) addEdge(graph, a, b);
        }
        break;
      case 'earth_link':
        if (!skipInternalBridge) {
          const a = findTerminalByLabel(component, 'PE_IN');
          const b = findTerminalByLabel(component, 'PE_OUT');
          if (a && b) addEdge(graph, a, b);
        }
        break;
      case 'control_wiring':
        if (!skipInternalBridge) {
          const a = findTerminalByLabel(component, 'CTRL_FROM');
          const b = findTerminalByLabel(component, 'CTRL_TO');
          if (a && b) addEdge(graph, a, b);
        }
        break;
      case 'power_cables':
        if (!skipInternalBridge) {
          const a = findTerminalByLabel(component, 'PWR_FROM');
          const b = findTerminalByLabel(component, 'PWR_TO');
          if (a && b) addEdge(graph, a, b);
        }
        break;
      case 'current_transformer':
        if (!skipInternalBridge) {
          const pairs: [string, string][] = [
            ['PRI_P1', 'PRI_P2'],
            ['SEC_S1', 'SEC_S2'],
          ];
          for (const [a, b] of pairs) {
            const ak = findTerminalByLabel(component, a);
            const bk = findTerminalByLabel(component, b);
            if (ak && bk) addEdge(graph, ak, bk);
          }
        }
        break;
      case 'voltage_transformer':
        if (!skipInternalBridge) {
          const pairs: [string, string][] = [
            ['PRI_L', 'SEC_L'],
            ['PRI_N', 'SEC_N'],
          ];
          for (const [a, b] of pairs) {
            const ak = findTerminalByLabel(component, a);
            const bk = findTerminalByLabel(component, b);
            if (ak && bk) addEdge(graph, ak, bk);
          }
        }
        break;
      case 'power_quality_analyzer':
        if (!skipInternalBridge) {
          bridgeLabelPairs(graph, component, BRIDGE_PAIRS_4P_LLLN);
        }
        break;
      case 'shunt_trip_coil':
      case 'closing_coil':
      case 'uvr_release':
        if (!skipInternalBridge && component.state === 'on') {
          const a1 = findTerminalByLabel(component, 'A1');
          const a2 = findTerminalByLabel(component, 'A2');
          if (a1 && a2) addEdge(graph, a1, a2);
        }
        break;
      case 'control_transformer':
        if (!skipInternalBridge) {
          const pL = findTerminalByLabel(component, 'PRI_L');
          const pN = findTerminalByLabel(component, 'PRI_N');
          const sL = findTerminalByLabel(component, 'SEC_L');
          const sN = findTerminalByLabel(component, 'SEC_N');
          if (pL && pN && sL && sN) {
            addEdge(graph, pL, sL);
            addEdge(graph, pN, sN);
          }
        }
        break;
      case 'three_phase_contactor':
      case 'four_phase_contactor':
        if (!skipInternalBridge && contactorPickupSet) {
          const pickedUp = contactorPickupSet.has(component.id);
          if (pickedUp) {
            const pairs =
              component.type === 'four_phase_contactor'
                ? BRIDGE_PAIRS_T_POWER_4P
                : BRIDGE_PAIRS_T_POWER_3P;
            bridgeLabelPairs(graph, component, pairs);
          }
          bridgeAuxContacts(graph, component, pickedUp);
        }
        break;
      case 'three_phase_mcb':
      case 'mccb':
      case 'motor_protection_circuit_breaker':
      case 'four_phase_mcb':
      case 'motorized_mccb':
      case 'four_pole_motorized_mccb':
      case 'air_circuit_breaker':
        if (
          component.state === 'on' &&
          !mainBreakerBmsInterlockOpen(component) &&
          !skipInternalBridge
        ) {
          const pairs =
            component.type === 'four_phase_mcb' ||
            component.type === 'air_circuit_breaker' ||
            component.type === 'four_pole_motorized_mccb'
              ? BRIDGE_PAIRS_4P_LLLN
              : BRIDGE_PAIRS_3P_LLL;
          bridgeLabelPairs(graph, component, pairs);
        }
        break;
      case 'plugin_component': {
        if (skipInternalBridge) break;
        const pluginSim = pluginSimConfigFromComponent(component);
        if (pluginSim) applyPluginInternalBridges(graph, component, pluginSim);
        break;
      }
      default:
        break;
    }
  }
}

/**
 * @param omitInternalConnectionForComponentId When set, that component's
 * IN↔OUT bridge is omitted (used to compute branch current through an MCB).
 * @param contactorPickupSet Main poles closed for these coil-actuated device ids.
 */
export function buildTerminalGraph(
  circuit: Circuit,
  omitInternalConnectionForComponentId?: string | null,
  contactorPickupSet?: Set<string> | null
): Map<string, Set<string>> {
  const graph = buildWireSkeletonGraph(circuit);
  applyInternalBridges(
    graph,
    circuit,
    omitInternalConnectionForComponentId,
    contactorPickupSet
  );
  return graph;
}

/* ------------------------------------------------------------------ */
/*  Contactor pickup fixpoint                                         */
/* ------------------------------------------------------------------ */

/**
 * Main poles close only when the coil sees live↔neutral. Iterates so a
 * downstream contactor can pick up after an upstream one closes.
 *
 * @param propagatePotentials Function that builds potential sets from a graph.
 * @param timerCoilEnergizedSinceMs Mutable timer latch map (engine owns it).
 */
export function computeContactorPickupFixpoint(
  circuit: Circuit,
  wallMs: number,
  propagatePotentials: (
    circuit: Circuit,
    graph: Map<string, Set<string>>
  ) => PotentialSets,
  timerCoilEnergizedSinceMs: Map<string, number>,
  graphCache?: TerminalGraphCache,
  simStepMs = 0
): Set<string> {
  const timerIdsInCircuit = new Set(
    circuit.components.filter((c) => c.type === 'timer').map((c) => c.id)
  );
  for (const id of timerCoilEnergizedSinceMs.keys()) {
    if (!timerIdsInCircuit.has(id)) {
      timerCoilEnergizedSinceMs.delete(id);
    }
  }

  let pickup = new Set<string>();
  for (const c of circuit.components) {
    if (!isCoilActuatedContactorType(c.type)) continue;
    if (c.type === 'timer') continue;
    if (c.state === 'on') pickup.add(c.id);
  }
  for (let iter = 0; iter < 16; iter++) {
    let graphPickup = pickup;
    let potentials: PotentialSets = {
      live: new Set(),
      neutral: new Set(),
      pe: new Set(),
      liveL1: new Set(),
      liveL2: new Set(),
      liveL3: new Set(),
    };
    for (let sub = 0; sub < 3; sub++) {
      const graph = graphCache
        ? graphCache.buildForPickupIteration(circuit, graphPickup)
        : buildTerminalGraph(circuit, null, graphPickup);
      potentials = propagatePotentials(circuit, graph);
      const smartOutputs = computeSmartRelayOutputs(circuit, potentials);
      const merged = unionPickupSets(pickup, smartOutputs);
      if (pickupSetsEqual(graphPickup, merged)) break;
      graphPickup = merged;
    }
    const next = new Set<string>();
    for (const c of circuit.components) {
      if (!isCoilActuatedContactorType(c.type)) continue;
      const coilHot = coilHasOperatingVoltage(c, potentials);
      if (c.type === 'timer') {
        const delayMs = Math.max(0, c.properties.timerDelayMs ?? 1000);
        if (!coilHot) {
          timerCoilEnergizedSinceMs.delete(c.id);
          continue;
        }
        if (!timerCoilEnergizedSinceMs.has(c.id)) {
          timerCoilEnergizedSinceMs.set(c.id, wallMs);
        }
        const since = timerCoilEnergizedSinceMs.get(c.id) ?? wallMs;
        let elapsed = wallMs - since;
        if (elapsed <= 0 && simStepMs > 0) elapsed = simStepMs;
        if (elapsed >= delayMs) {
          next.add(c.id);
        }
        continue;
      }
      if (c.type === 'smart_relay') continue;
      if (coilHot) {
        next.add(c.id);
      }
    }
    if (pickupSetsEqual(pickup, next)) {
      pickup = next;
      break;
    }
    pickup = next;
  }
  const finalGraphPickup = unionPickupSets(
    pickup,
    computeSmartRelayOutputs(
      circuit,
      propagatePotentials(
        circuit,
        graphCache
          ? graphCache.buildForPickupIteration(circuit, pickup)
          : buildTerminalGraph(circuit, null, pickup)
      )
    )
  );
  const finalSmart = new Set(
    [...finalGraphPickup].filter((id) => {
      const c = circuit.components.find((x) => x.id === id);
      return c?.type === 'smart_relay';
    })
  );
  for (const c of circuit.components) {
    if (c.type === 'smart_relay') {
      c.state = finalSmart.has(c.id) ? 'on' : 'off';
      continue;
    }
    if (!isCoilActuatedContactorType(c.type)) continue;
    c.state = pickup.has(c.id) ? 'on' : 'off';
  }
  for (const c of circuit.components) {
    if (c.type !== 'aux_contact_block') continue;
    const fid = c.properties.auxContactFollowContactorId?.trim();
    if (!fid) continue;
    c.state = finalGraphPickup.has(fid) ? 'on' : 'off';
  }
  return finalGraphPickup;
}
