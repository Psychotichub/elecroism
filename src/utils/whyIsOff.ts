import type { Circuit, CircuitComponent, SimulationResult } from '../types';
import { isLoadComponent } from '../simulation/componentClassification';
import {
  buildTerminalGraph,
  computeContactorPickupFixpoint,
  isCoilActuatedContactorType,
  mainBreakerBmsInterlockOpen,
} from '../simulation/terminalGraph';
import {
  hasPolarityCorrectSupply,
  propagatePotentials,
} from '../simulation/potentials';
import {
  linePotentialAt,
  splitTerminalKey,
  terminalKey,
} from '../simulation/engineTypes';

const PASSTHROUGH_TYPES = new Set<CircuitComponent['type']>([
  'junction',
  'connection_point',
  'busbar',
  'busbar_system',
  'neutral_bar_system',
  'earth_bar_grounding_system',
]);

const SOURCE_TYPES = new Set<CircuitComponent['type']>([
  'power_source',
  'dc_power_source',
  'three_phase_source',
]);

function componentTitle(c: CircuitComponent): string {
  const lab = c.label?.trim();
  return lab ? `${lab} (${c.type.replace(/_/g, ' ')})` : c.type.replace(/_/g, ' ');
}

function buildWireAdjacency(circuit: Circuit): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  };
  for (const w of circuit.wires) {
    const from = terminalKey(w.fromComponentId, w.fromPointId);
    const to = terminalKey(w.toComponentId, w.toPointId);
    link(from, to);
  }
  return adj;
}

function reachableViaWires(
  circuit: Circuit,
  startKey: string
): Set<string> {
  const adj = buildWireAdjacency(circuit);
  const visited = new Set<string>();
  const queue = [startKey];
  while (queue.length > 0) {
    const key = queue.shift()!;
    if (visited.has(key)) continue;
    visited.add(key);
    const split = splitTerminalKey(key);
    if (!split) continue;
    const comp = circuit.components.find((c) => c.id === split.componentId);
    if (!comp) continue;
    for (const neighbor of adj.get(key) ?? []) {
      if (!visited.has(neighbor)) queue.push(neighbor);
    }
    if (PASSTHROUGH_TYPES.has(comp.type)) {
      for (const cp of comp.connectionPoints) {
        const k = terminalKey(comp.id, cp.id);
        if (!visited.has(k)) queue.push(k);
      }
    }
  }
  return visited;
}

function findUpstreamBlocker(
  circuit: Circuit,
  startKey: string,
  contactorPickup: Set<string>
): string | null {
  const reached = reachableViaWires(circuit, startKey);
  const reachedCompIds = new Set<string>();
  for (const key of reached) {
    const split = splitTerminalKey(key);
    if (split) reachedCompIds.add(split.componentId);
  }

  for (const comp of circuit.components) {
    if (!reachedCompIds.has(comp.id)) continue;
    if (PASSTHROUGH_TYPES.has(comp.type)) continue;

    if (SOURCE_TYPES.has(comp.type)) {
      if (comp.state === 'off' || comp.state === 'tripped') {
        return `${componentTitle(comp)} is OFF — no supply from this source.`;
      }
      continue;
    }

    if (isCoilActuatedContactorType(comp.type) && !contactorPickup.has(comp.id)) {
      return `${componentTitle(comp)} coil not energized — main contacts open.`;
    }

    if (mainBreakerBmsInterlockOpen(comp)) {
      return `${componentTitle(comp)} BMS interlock open (UVR or control supply missing).`;
    }

    if (
      comp.state === 'off' ||
      comp.state === 'tripped' ||
      comp.state === 'fault'
    ) {
      return `${componentTitle(comp)} is ${comp.state.toUpperCase()} — circuit open upstream.`;
    }
  }

  return null;
}

function missingSupplyDescription(
  component: CircuitComponent,
  potentials: ReturnType<typeof propagatePotentials>
): string | null {
  for (const cp of component.connectionPoints) {
    const key = terminalKey(component.id, cp.id);
    const label = cp.label.toUpperCase();
    if (label === 'N' || label === 'T2' || label.includes('NEUTRAL')) {
      if (!potentials.neutral.has(key)) {
        return `Neutral not present at terminal ${cp.label}.`;
      }
    } else if (label === 'PE' || label.includes('EARTH') || label === 'GND') {
      if (!potentials.pe.has(key)) {
        return `Protective earth not present at terminal ${cp.label}.`;
      }
    } else if (label === 'L1') {
      if (!potentials.liveL1.has(key)) {
        return `Phase L1 not present at terminal ${cp.label}.`;
      }
    } else if (label === 'L2') {
      if (!potentials.liveL2.has(key)) {
        return `Phase L2 not present at terminal ${cp.label}.`;
      }
    } else if (label === 'L3') {
      if (!potentials.liveL3.has(key)) {
        return `Phase L3 not present at terminal ${cp.label}.`;
      }
    } else if (
      label === 'L' ||
      label === 'T1' ||
      label.includes('LINE') ||
      label.includes('LIVE')
    ) {
      if (!linePotentialAt(potentials, key)) {
        return `Line/live not present at terminal ${cp.label}.`;
      }
    }
  }
  return null;
}

function firstUnwiredTerminal(circuit: Circuit, component: CircuitComponent): string | null {
  const degree = new Map<string, number>();
  for (const w of circuit.wires) {
    const bump = (cid: string, pid: string) => {
      const k = `${cid}:${pid}`;
      degree.set(k, (degree.get(k) ?? 0) + 1);
    };
    bump(w.fromComponentId, w.fromPointId);
    bump(w.toComponentId, w.toPointId);
  }
  const unwired = component.connectionPoints.filter(
    (cp) => (degree.get(`${component.id}:${cp.id}`) ?? 0) === 0
  );
  if (unwired.length === 0) return null;
  return unwired.map((cp) => cp.label).join(', ');
}

/**
 * Explain why a component is de-energized. Returns null when energized or unknown.
 */
export function explainWhyDeenergized(
  circuit: Circuit,
  componentId: string,
  simulationResult: SimulationResult | null
): string | null {
  const comp = circuit.components.find((c) => c.id === componentId);
  const node = simulationResult?.nodes[componentId];
  if (!comp || !node || node.energized) return null;

  if (comp.state === 'off') {
    return `${componentTitle(comp)} is switched OFF.`;
  }
  if (comp.state === 'tripped') {
    return `${componentTitle(comp)} has TRIPPED.`;
  }
  if (comp.state === 'fault') {
    return `${componentTitle(comp)} is in FAULT state.`;
  }
  if (mainBreakerBmsInterlockOpen(comp)) {
    return `${componentTitle(comp)} BMS interlock is open — UVR or control supply missing.`;
  }

  const unwired = firstUnwiredTerminal(circuit, comp);
  if (unwired) {
    return `${componentTitle(comp)} has unwired terminal(s): ${unwired}.`;
  }

  const timerMap = new Map<string, number>();
  const pickup = computeContactorPickupFixpoint(
    circuit,
    Date.now(),
    propagatePotentials,
    timerMap
  );
  const graph = buildTerminalGraph(circuit, null, pickup);
  const potentials = propagatePotentials(circuit, graph);

  if (isLoadComponent(comp) && !hasPolarityCorrectSupply(comp, potentials)) {
    const missing = missingSupplyDescription(comp, potentials);
    if (missing) {
      const startCp = comp.connectionPoints.find((cp) => {
        const key = terminalKey(comp.id, cp.id);
        const label = cp.label.toUpperCase();
        if (label === 'N' || label === 'T2') return !potentials.neutral.has(key);
        if (label === 'L1') return !potentials.liveL1.has(key);
        if (label === 'L2') return !potentials.liveL2.has(key);
        if (label === 'L3') return !potentials.liveL3.has(key);
        if (label === 'L' || label === 'T1') return !linePotentialAt(potentials, key);
        return false;
      });
      if (startCp) {
        const blocker = findUpstreamBlocker(
          circuit,
          terminalKey(comp.id, startCp.id),
          pickup
        );
        if (blocker) return `${missing} ${blocker}`;
      }
      return missing;
    }
  }

  if (isCoilActuatedContactorType(comp.type) && !pickup.has(comp.id)) {
    return `${componentTitle(comp)} coil not energized — auxiliary/main contacts open.`;
  }

  const liveCp = comp.connectionPoints.find((cp) => {
    const key = terminalKey(comp.id, cp.id);
    return linePotentialAt(potentials, key);
  });
  if (liveCp) {
    const blocker = findUpstreamBlocker(
      circuit,
      terminalKey(comp.id, liveCp.id),
      pickup
    );
    if (blocker) return blocker;
  }

  return `${componentTitle(comp)} has no complete supply path to a source.`;
}
