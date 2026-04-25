import type {
  Circuit,
  SimulationResult,
  NodeResult,
  FaultEvent,
  CircuitComponent,
  Wire,
} from '../types';

interface PotentialSets {
  live: Set<string>;
  neutral: Set<string>;
  pe: Set<string>;
}

export class CircuitEngine {
  simulate(circuit: Circuit, depth = 0): SimulationResult {
    if (depth > 6) {
      return this.buildDegradedResult(circuit);
    }

    const terminalGraph = this.buildTerminalGraph(circuit);
    const potentials = this.propagatePotentials(circuit, terminalGraph);
    const nodes: Record<string, NodeResult> = {};
    const faults: FaultEvent[] = [];
    const sourceVoltage =
      circuit.components.find((c) => c.type === 'power_source')?.properties
        .voltage || 230;

    for (const component of circuit.components) {
      const isOpen = component.state === 'off' || component.state === 'tripped';
      const hasPotential = this.componentTouchesAnyPotential(
        component,
        potentials
      );

      let energized = false;
      let currentA = 0;

      if (!isOpen) {
        if (this.isLoadComponent(component)) {
          energized = this.hasPolarityCorrectSupply(component, potentials);
          currentA = energized ? this.calculateCurrent(component, sourceVoltage) : 0;
        } else {
          energized = hasPotential || component.type === 'power_source';
        }
      }

      const pf = this.getPowerFactor(component);
      const powerVA = sourceVoltage * currentA;
      const powerW = powerVA * pf;

      nodes[component.id] = {
        nodeId: component.id,
        voltageV: energized ? sourceVoltage : 0,
        currentA,
        powerW,
        powerVA,
        powerFactor: pf,
        energized,
      };
    }

    const lnFaultAnchors = this.getLiveSideAnchorsOfLineNeutralCrossWires(
      circuit,
      potentials
    );
    const prospectiveShortCurrentA = 5000;

    const seriesPathCurrents = new Map<string, number>();
    for (const component of circuit.components) {
      if (!this.isSeriesPathComponent(component)) continue;
      if (component.state === 'off' || component.state === 'tripped') continue;
      let branchCurrent = this.getBranchCurrentThroughDevice(
        component,
        circuit,
        nodes
      );
      if (
        lnFaultAnchors.size > 0 &&
        this.seriesDeviceOnLivePathToLnFault(
          component,
          circuit,
          lnFaultAnchors
        )
      ) {
        branchCurrent = Math.max(branchCurrent, prospectiveShortCurrentA);
      }
      seriesPathCurrents.set(component.id, branchCurrent);
      if (nodes[component.id]) {
        const pf = this.getPowerFactor(component);
        nodes[component.id] = {
          ...nodes[component.id],
          currentA: branchCurrent,
          powerVA: sourceVoltage * branchCurrent,
          powerW: sourceVoltage * branchCurrent * pf,
        };
      }
    }

    let anySeriesDeviceTripped = false;
    for (const component of circuit.components) {
      if (!this.isSeriesProtectionDevice(component)) continue;
      if (component.state === 'off' || component.state === 'tripped') continue;
      const branchCurrent = seriesPathCurrents.get(component.id) || 0;
      const fault = this.checkFaults(component, branchCurrent);
      if (!fault) continue;
      faults.push(fault);
      component.state = 'tripped';
      anySeriesDeviceTripped = true;
      nodes[component.id] = {
        nodeId: component.id,
        voltageV: 0,
        currentA: 0,
        powerW: 0,
        powerVA: 0,
        powerFactor: this.getPowerFactor(component),
        energized: false,
      };
    }

    if (anySeriesDeviceTripped) {
      const next = this.simulate(circuit, depth + 1);
      return {
        ...next,
        faults: [...faults, ...next.faults],
      };
    }

    this.updateWireStates(circuit, nodes, potentials);

    let totalPowerW = 0;
    let totalCurrentA = 0;
    for (const c of circuit.components) {
      const n = nodes[c.id];
      if (!n?.energized) continue;
      if (this.isLoadComponent(c)) {
        totalPowerW += n.powerW;
        totalCurrentA += n.currentA;
      }
    }

    return {
      success: true,
      nodes,
      faults,
      timestamp: Date.now(),
      totalPowerW,
      totalCurrentA,
    };
  }

  private buildDegradedResult(circuit: Circuit): SimulationResult {
    const nodes: Record<string, NodeResult> = {};
    for (const c of circuit.components) {
      nodes[c.id] = {
        nodeId: c.id,
        voltageV: 0,
        currentA: 0,
        powerW: 0,
        powerVA: 0,
        powerFactor: 1,
        energized: false,
      };
    }
    return {
      success: true,
      nodes,
      faults: [],
      timestamp: Date.now(),
      totalPowerW: 0,
      totalCurrentA: 0,
    };
  }

  private isSeriesProtectionDevice(c: CircuitComponent): boolean {
    return (
      c.type === 'mcb' ||
      c.type === 'rcd' ||
      c.type === 'overload_relay'
    );
  }

  private isSeriesPathComponent(c: CircuitComponent): boolean {
    return (
      c.type === 'switch' ||
      c.type === 'push_button' ||
      c.type === 'mcb' ||
      c.type === 'rcd' ||
      c.type === 'overload_relay' ||
      c.type === 'contactor' ||
      c.type === 'relay' ||
      c.type === 'timer'
    );
  }

  /** Live terminal used for “downstream of this series device” checks. */
  private getLoadLiveTerminalKey(component: CircuitComponent): string | null {
    if (component.type === 'socket') {
      const cp = component.connectionPoints.find(
        (p) => p.label.toUpperCase() === 'L'
      );
      return cp ? this.terminalKey(component.id, cp.id) : null;
    }
    if (
      component.type === 'lamp' ||
      component.type === 'heater' ||
      component.type === 'motor' ||
      component.type === 'generic_load'
    ) {
      const cp = component.connectionPoints.find(
        (p) => p.label.toUpperCase() === 'T1'
      );
      return cp ? this.terminalKey(component.id, cp.id) : null;
    }
    return null;
  }

  /**
   * Current that would flow through this device’s IN–OUT path: sum of load
   * currents whose live terminal is not reachable from the source when this
   * device’s internal bridge is removed (i.e. the load depends on this link).
   */
  private getBranchCurrentThroughDevice(
    seriesDevice: CircuitComponent,
    circuit: Circuit,
    nodes: Record<string, NodeResult>
  ): number {
    const graph = this.buildTerminalGraph(circuit, seriesDevice.id);
    const liveStarts = this.getLiveStartKeys(circuit);
    const liveWithoutBridge = this.bfsFrom(graph, liveStarts);

    let sum = 0;
    for (const comp of circuit.components) {
      if (!this.isLoadComponent(comp)) continue;
      const liveKey = this.getLoadLiveTerminalKey(comp);
      if (!liveKey) continue;
      const loadI = nodes[comp.id]?.currentA || 0;
      if (loadI <= 0) continue;
      if (!liveWithoutBridge.has(liveKey)) {
        sum += loadI;
      }
    }
    return sum;
  }

  /**
   * Live-side terminals of wires that directly tie the live network to the
   * neutral network (bolted L–N). Using wire endpoints avoids false trips when
   * live and neutral merely share a busbar/junction node graph.
   */
  private getLiveSideAnchorsOfLineNeutralCrossWires(
    circuit: Circuit,
    potentials: PotentialSets
  ): Set<string> {
    const anchors = new Set<string>();
    for (const w of circuit.wires) {
      const fk = this.terminalKey(w.fromComponentId, w.fromPointId);
      const tk = this.terminalKey(w.toComponentId, w.toPointId);
      const fl = potentials.live.has(fk);
      const fn = potentials.neutral.has(fk);
      const tl = potentials.live.has(tk);
      const tn = potentials.neutral.has(tk);
      if (fl && tn) anchors.add(fk);
      if (fn && tl) anchors.add(tk);
    }
    return anchors;
  }

  /**
   * True if removing this device’s IN↔OUT bridge breaks reachability from the
   * source live to at least one L–N fault anchor (fault current passes here).
   */
  private seriesDeviceOnLivePathToLnFault(
    seriesDevice: CircuitComponent,
    circuit: Circuit,
    faultLiveAnchors: Set<string>
  ): boolean {
    if (faultLiveAnchors.size === 0) return false;
    const graphWithout = this.buildTerminalGraph(circuit, seriesDevice.id);
    const liveStarts = this.getLiveStartKeys(circuit);
    const liveReach = this.bfsFrom(graphWithout, liveStarts);
    for (const key of faultLiveAnchors) {
      if (!liveReach.has(key)) return true;
    }
    return false;
  }

  private getLiveStartKeys(circuit: Circuit): string[] {
    const keys: string[] = [];
    for (const source of circuit.components) {
      if (source.type !== 'power_source') continue;
      if (source.state === 'off' || source.state === 'tripped') continue;
      for (const cp of source.connectionPoints) {
        const key = this.terminalKey(source.id, cp.id);
        const tokens = this.tokenizeLabel(cp.label);
        if (
          tokens.includes('L') ||
          tokens.includes('LINE') ||
          tokens.includes('PHASE')
        ) {
          keys.push(key);
        }
      }
    }
    return keys;
  }

  private terminalKey(componentId: string, pointId: string): string {
    return `${componentId}:${pointId}`;
  }

  private addEdge(graph: Map<string, Set<string>>, a: string, b: string): void {
    if (!graph.has(a)) graph.set(a, new Set());
    if (!graph.has(b)) graph.set(b, new Set());
    graph.get(a)?.add(b);
    graph.get(b)?.add(a);
  }

  private connectAll(graph: Map<string, Set<string>>, keys: string[]): void {
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        this.addEdge(graph, keys[i], keys[j]);
      }
    }
  }

  /**
   * @param omitInternalConnectionForComponentId When set, that component’s
   * IN↔OUT bridge is omitted (used to compute branch current through an MCB).
   */
  private buildTerminalGraph(
    circuit: Circuit,
    omitInternalConnectionForComponentId?: string | null
  ): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    for (const component of circuit.components) {
      for (const cp of component.connectionPoints) {
        const key = this.terminalKey(component.id, cp.id);
        if (!graph.has(key)) graph.set(key, new Set());
      }
    }

    for (const wire of circuit.wires) {
      const fromKey = this.terminalKey(wire.fromComponentId, wire.fromPointId);
      const toKey = this.terminalKey(wire.toComponentId, wire.toPointId);
      if (graph.has(fromKey) && graph.has(toKey)) {
        this.addEdge(graph, fromKey, toKey);
      }
    }

    for (const component of circuit.components) {
      const keys = component.connectionPoints.map((cp) =>
        this.terminalKey(component.id, cp.id)
      );
      if (keys.length < 2) continue;

      const skipInternalBridge =
        omitInternalConnectionForComponentId === component.id;

      switch (component.type) {
        case 'busbar':
        case 'junction':
          this.connectAll(graph, keys);
          break;
        case 'switch':
        case 'push_button':
        case 'mcb':
        case 'rcd':
        case 'overload_relay':
          if (component.state === 'on' && !skipInternalBridge) {
            const inKey = this.findTerminalByLabel(component, 'IN');
            const outKey = this.findTerminalByLabel(component, 'OUT');
            if (inKey && outKey) this.addEdge(graph, inKey, outKey);
          }
          break;
        case 'contactor':
        case 'relay':
        case 'timer':
          if (component.state === 'on' && !skipInternalBridge) {
            const inKey = this.findTerminalByLabel(component, 'IN');
            const outKey = this.findTerminalByLabel(component, 'OUT');
            if (inKey && outKey) this.addEdge(graph, inKey, outKey);
          }
          break;
        default:
          break;
      }
    }

    return graph;
  }

  private findTerminalByLabel(
    component: CircuitComponent,
    expectedLabel: string
  ): string | null {
    const found = component.connectionPoints.find(
      (cp) => cp.label.toUpperCase() === expectedLabel
    );
    if (!found) return null;
    return this.terminalKey(component.id, found.id);
  }

  private bfsFrom(
    graph: Map<string, Set<string>>,
    starts: string[]
  ): Set<string> {
    const visited = new Set<string>();
    const queue = starts.filter((k) => graph.has(k));
    while (queue.length > 0) {
      const key = queue.shift();
      if (!key || visited.has(key)) continue;
      visited.add(key);
      for (const next of graph.get(key) || []) {
        if (!visited.has(next)) queue.push(next);
      }
    }
    return visited;
  }

  private tokenizeLabel(label: string): string[] {
    return label
      .toUpperCase()
      .split(/[^A-Z0-9]+/)
      .filter(Boolean);
  }

  private propagatePotentials(
    circuit: Circuit,
    graph: Map<string, Set<string>>
  ): PotentialSets {
    const liveStarts: string[] = [];
    const neutralStarts: string[] = [];
    const peStarts: string[] = [];

    for (const source of circuit.components) {
      if (source.type !== 'power_source') continue;
      if (source.state === 'off' || source.state === 'tripped') continue;
      for (const cp of source.connectionPoints) {
        const key = this.terminalKey(source.id, cp.id);
        const tokens = this.tokenizeLabel(cp.label);
        if (
          tokens.includes('L') ||
          tokens.includes('LINE') ||
          tokens.includes('PHASE')
        ) {
          liveStarts.push(key);
        } else if (
          tokens.includes('N') ||
          tokens.includes('NEUTRAL')
        ) {
          neutralStarts.push(key);
        } else if (
          tokens.includes('PE') ||
          tokens.includes('EARTH') ||
          tokens.includes('GROUND')
        ) {
          peStarts.push(key);
        }
      }
    }

    return {
      live: this.bfsFrom(graph, liveStarts),
      neutral: this.bfsFrom(graph, neutralStarts),
      pe: this.bfsFrom(graph, peStarts),
    };
  }

  private componentTouchesAnyPotential(
    component: CircuitComponent,
    potentials: PotentialSets
  ): boolean {
    return component.connectionPoints.some((cp) => {
      const key = this.terminalKey(component.id, cp.id);
      return (
        potentials.live.has(key) ||
        potentials.neutral.has(key) ||
        potentials.pe.has(key)
      );
    });
  }

  /**
   * Polarity-aware supply: the load only energizes when each terminal that is
   * *meant* for a given conductor actually sits on that conductor’s network.
   * Example: L must be on live, N on neutral (not swapped); T1/T2 loads use
   * T1 = line, T2 = neutral. Plain “any terminal has live and any has neutral”
   * would wrongly energize on swapped or shorted-only cases for labeled devices.
   */
  private hasPolarityCorrectSupply(
    component: CircuitComponent,
    potentials: PotentialSets
  ): boolean {
    const roles = this.getRequiredPolarityRoles(component);
    if (!roles) {
      return this.hasCompleteSupplyAnyTerminal(component, potentials);
    }

    for (const { pointId, needLive, needNeutral, needPe } of roles) {
      const key = this.terminalKey(component.id, pointId);
      if (needLive && !potentials.live.has(key)) return false;
      if (needNeutral && !potentials.neutral.has(key)) return false;
      if (needPe && !potentials.pe.has(key)) return false;
    }
    return true;
  }

  private getRequiredPolarityRoles(
    component: CircuitComponent
  ): { pointId: string; needLive: boolean; needNeutral: boolean; needPe: boolean }[] | null {
    switch (component.type) {
      case 'socket': {
        const out: {
          pointId: string;
          needLive: boolean;
          needNeutral: boolean;
          needPe: boolean;
        }[] = [];
        for (const cp of component.connectionPoints) {
          const label = cp.label.toUpperCase();
          if (label === 'L') {
            out.push({ pointId: cp.id, needLive: true, needNeutral: false, needPe: false });
          } else if (label === 'N') {
            out.push({ pointId: cp.id, needLive: false, needNeutral: true, needPe: false });
          } else if (label === 'PE') {
            out.push({ pointId: cp.id, needLive: false, needNeutral: false, needPe: true });
          }
        }
        return out.length >= 2 ? out : null;
      }
      case 'lamp':
      case 'heater':
      case 'motor':
      case 'generic_load': {
        const t1 = component.connectionPoints.find(
          (cp) => cp.label.toUpperCase() === 'T1'
        );
        const t2 = component.connectionPoints.find(
          (cp) => cp.label.toUpperCase() === 'T2'
        );
        if (!t1 || !t2) return null;
        return [
          { pointId: t1.id, needLive: true, needNeutral: false, needPe: false },
          { pointId: t2.id, needLive: false, needNeutral: true, needPe: false },
        ];
      }
      default:
        return null;
    }
  }

  /** Fallback when terminals are not labeled for polarity (should be rare). */
  private hasCompleteSupplyAnyTerminal(
    component: CircuitComponent,
    potentials: PotentialSets
  ): boolean {
    let hasLive = false;
    let hasNeutral = false;
    for (const cp of component.connectionPoints) {
      const key = this.terminalKey(component.id, cp.id);
      if (potentials.live.has(key)) hasLive = true;
      if (potentials.neutral.has(key)) hasNeutral = true;
      if (hasLive && hasNeutral) return true;
    }
    return false;
  }

  private isLoadComponent(component: CircuitComponent): boolean {
    switch (component.type) {
      case 'lamp':
      case 'heater':
      case 'generic_load':
      case 'motor':
      case 'socket':
        return true;
      default:
        return false;
    }
  }

  private calculateCurrent(
    component: CircuitComponent,
    voltage: number
  ): number {
    const p = component.properties;
    const pf = this.getPowerFactor(component);

    switch (component.type) {
      case 'lamp':
      case 'heater':
      case 'generic_load':
        return (p.powerWatts || 60) / (voltage * pf);
      case 'motor':
        return ((p.powerWatts || 1000) / (voltage * pf)) * 1.25;
      case 'socket':
        return p.powerWatts ? p.powerWatts / (voltage * pf) : 0;
      default:
        return 0;
    }
  }

  private getPowerFactor(component: CircuitComponent): number {
    if (component.properties.powerFactor !== undefined) {
      return component.properties.powerFactor;
    }
    switch (component.properties.loadType) {
      case 'resistive':
        return 1.0;
      case 'inductive':
        return 0.8;
      case 'capacitive':
        return 0.95;
      default:
        return 1.0;
    }
  }

  private checkFaults(
    component: CircuitComponent,
    currentA: number
  ): FaultEvent | null {
    const p = component.properties;
    if (component.type === 'mcb') {
      if (currentA > 1000) {
        return {
          id: crypto.randomUUID(),
          type: 'short_circuit',
          affectedComponentId: component.id,
          message: `MCB "${component.label}" magnetic / short-circuit trip: ${currentA.toFixed(0)}A`,
          severity: 'critical',
          timestamp: Date.now(),
        };
      }
      if (p.ratingAmps && currentA > p.ratingAmps) {
        return {
          id: crypto.randomUUID(),
          type: 'overload',
          affectedComponentId: component.id,
          message: `MCB "${component.label}" overloaded: ${currentA.toFixed(1)}A exceeds ${p.ratingAmps}A rating`,
          severity: 'critical',
          timestamp: Date.now(),
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
          timestamp: Date.now(),
        };
      }
      return {
        id: crypto.randomUUID(),
        type: 'overload',
        affectedComponentId: component.id,
        message: `Overload relay "${component.label}" tripped: ${currentA.toFixed(1)}A exceeds ${p.ratingAmps}A`,
        severity: 'critical',
        timestamp: Date.now(),
      };
    }

    if (component.type === 'rcd' && currentA > 1000) {
      return {
        id: crypto.randomUUID(),
        type: 'short_circuit',
        affectedComponentId: component.id,
        message: `Short circuit detected at "${component.label}"`,
        severity: 'critical',
        timestamp: Date.now(),
      };
    }

    return null;
  }

  private updateWireStates(
    circuit: Circuit,
    nodes: Record<string, NodeResult>,
    potentials: PotentialSets
  ): void {
    circuit.wires.forEach((wire: Wire) => {
      const fromKey = this.terminalKey(wire.fromComponentId, wire.fromPointId);
      const toKey = this.terminalKey(wire.toComponentId, wire.toPointId);
      const carriesPotential =
        potentials.live.has(fromKey) ||
        potentials.live.has(toKey) ||
        potentials.neutral.has(fromKey) ||
        potentials.neutral.has(toKey) ||
        potentials.pe.has(fromKey) ||
        potentials.pe.has(toKey);

      const fromNode = nodes[wire.fromComponentId];
      const toNode = nodes[wire.toComponentId];
      wire.energized = carriesPotential;
      wire.currentAmps = carriesPotential
        ? Math.max(fromNode?.currentA || 0, toNode?.currentA || 0)
        : 0;
    });
  }

}

export const engine = new CircuitEngine();
