import type { Circuit, CircuitComponent } from '../types';
import { mcbLayoutPoles } from '../store/circuitConnectionGeometry';
import {
  cloneTerminalGraph,
  terminalKey,
  type TerminalGraph,
} from './engineTypes';
import {
  applyInternalBridges,
  buildWireSkeletonGraph,
} from './terminalGraph';

/** Max components to patch incrementally before falling back to a full bridge pass. */
const INCREMENTAL_BRIDGE_PATCH_LIMIT = 12;

export function computeCircuitTopologyKey(circuit: Circuit): string {
  const compPart = circuit.components
    .map(
      (c) =>
        `${c.id}:${c.type}:${c.connectionPoints.map((p) => p.id).join(',')}`
    )
    .sort()
    .join(';');
  const wirePart = circuit.wires
    .map(
      (w) =>
        `${w.fromComponentId}:${w.fromPointId}:${w.toComponentId}:${w.toPointId}`
    )
    .sort()
    .join(';');
  return `${compPart}#${wirePart}`;
}

export function serializePickupSet(pickup: Set<string> | null | undefined): string {
  if (!pickup || pickup.size === 0) return '';
  return [...pickup].sort().join(',');
}

function pushButtonBridgeConducting(c: CircuitComponent): boolean {
  if (c.type !== 'push_button') return false;
  const nc = c.properties.buttonType === 'NC';
  const pressed = (c as CircuitComponent & { pressed?: boolean }).pressed;
  if (pressed !== undefined) {
    return nc ? !pressed : !!pressed;
  }
  return nc ? true : c.state === 'on';
}

function breakerBmsInterlockOpen(component: CircuitComponent): boolean {
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

/** Signature of switch-state / properties that affect internal device bridges. */
export function componentBridgeSignature(component: CircuitComponent): string {
  const p = component.properties;
  const pressed =
    component.type === 'push_button'
      ? (component as CircuitComponent & { pressed?: boolean }).pressed
      : undefined;
  const parts = [
    component.id,
    component.type,
    component.state,
    pressed === undefined ? '' : pressed ? '1' : '0',
    pushButtonBridgeConducting(component) ? 'pb-on' : 'pb-off',
    p.buttonType ?? '',
    p.selectorPosition ?? '',
    p.auxContactFollowContactorId?.trim() ?? '',
    component.type === 'mcb' ? String(mcbLayoutPoles(component)) : '',
    breakerBmsInterlockOpen(component) ? 'bms-open' : 'bms-closed',
    p.acbBmsUvrEnergized === false ? 'uvr-off' : '',
    p.mccbBmsCtrlVoltageOk === false ? 'ctrl-off' : '',
  ];
  return parts.join(':');
}

export function stripComponentInternalBridges(
  graph: TerminalGraph,
  component: CircuitComponent
): void {
  const keys = new Set(
    component.connectionPoints.map((cp) => terminalKey(component.id, cp.id))
  );
  for (const key of keys) {
    const neighbors = graph.get(key);
    if (!neighbors) continue;
    for (const neighbor of [...neighbors]) {
      if (!keys.has(neighbor)) continue;
      neighbors.delete(neighbor);
      graph.get(neighbor)?.delete(key);
    }
  }
}

/**
 * Memoizes wire skeletons and reuses bridge overlays across simulate() calls
 * and contactor pickup fixpoint iterations.
 */
export class TerminalGraphCache {
  private skeletonKey = '';
  private skeleton: TerminalGraph | null = null;

  private graphKey = '';
  private graph: TerminalGraph | null = null;

  private bridgeSignatures = new Map<string, string>();
  private pickupGraphCache = new Map<string, TerminalGraph>();

  clear(): void {
    this.skeletonKey = '';
    this.skeleton = null;
    this.graphKey = '';
    this.graph = null;
    this.bridgeSignatures.clear();
    this.pickupGraphCache.clear();
  }

  private ensureSkeleton(circuit: Circuit): TerminalGraph {
    const topo = computeCircuitTopologyKey(circuit);
    if (topo !== this.skeletonKey || !this.skeleton) {
      this.skeleton = buildWireSkeletonGraph(circuit);
      this.skeletonKey = topo;
      this.graph = null;
      this.graphKey = '';
      this.bridgeSignatures.clear();
      this.pickupGraphCache.clear();
    }
    return this.skeleton;
  }

  private currentBridgeSignatures(
    circuit: Circuit
  ): Map<string, string> {
    const sigs = new Map<string, string>();
    for (const c of circuit.components) {
      sigs.set(c.id, componentBridgeSignature(c));
    }
    return sigs;
  }

  private changedBridgeComponentIds(
    circuit: Circuit
  ): Set<string> | null {
    const next = this.currentBridgeSignatures(circuit);
    if (this.bridgeSignatures.size === 0) {
      this.bridgeSignatures = next;
      return null;
    }
    const changed = new Set<string>();
    for (const c of circuit.components) {
      if (this.bridgeSignatures.get(c.id) !== next.get(c.id)) {
        changed.add(c.id);
      }
    }
    if (changed.size === 0) return new Set();
    this.bridgeSignatures = next;
    return changed;
  }

  build(
    circuit: Circuit,
    omitInternalConnectionForComponentId?: string | null,
    contactorPickupSet?: Set<string> | null
  ): TerminalGraph {
    const skeleton = this.ensureSkeleton(circuit);
    const omit = omitInternalConnectionForComponentId ?? '';
    const pickupKey = serializePickupSet(contactorPickupSet);
    const graphKey = `${this.skeletonKey}|${omit}|${pickupKey}`;
    const changedIds = this.changedBridgeComponentIds(circuit);

    if (
      graphKey === this.graphKey &&
      this.graph &&
      changedIds &&
      changedIds.size === 0
    ) {
      return cloneTerminalGraph(this.graph);
    }

    let graph: TerminalGraph;

    if (
      this.graph &&
      graphKey === this.graphKey &&
      changedIds &&
      changedIds.size > 0 &&
      changedIds.size <= INCREMENTAL_BRIDGE_PATCH_LIMIT
    ) {
      graph = cloneTerminalGraph(this.graph);
      for (const id of changedIds) {
        const comp = circuit.components.find((c) => c.id === id);
        if (comp) stripComponentInternalBridges(graph, comp);
      }
      applyInternalBridges(
        graph,
        circuit,
        omitInternalConnectionForComponentId,
        contactorPickupSet,
        changedIds
      );
    } else {
      graph = cloneTerminalGraph(skeleton);
      applyInternalBridges(
        graph,
        circuit,
        omitInternalConnectionForComponentId,
        contactorPickupSet
      );
    }

    this.graph = graph;
    this.graphKey = graphKey;
    return cloneTerminalGraph(graph);
  }

  /** Reuse graphs across contactor pickup fixpoint iterations (same topology). */
  buildForPickupIteration(
    circuit: Circuit,
    pickup: Set<string>
  ): TerminalGraph {
    this.ensureSkeleton(circuit);
    const pickupKey = serializePickupSet(pickup);
    const cached = this.pickupGraphCache.get(pickupKey);
    if (cached) {
      return cloneTerminalGraph(cached);
    }
    const graph = cloneTerminalGraph(this.skeleton!);
    applyInternalBridges(graph, circuit, null, pickup);
    this.pickupGraphCache.set(pickupKey, graph);
    return cloneTerminalGraph(graph);
  }
}
