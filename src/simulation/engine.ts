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
  /** Terminals fed from three-phase source L1 (TN-C-S / 400 V wye) */
  liveL1: Set<string>;
  liveL2: Set<string>;
  liveL3: Set<string>;
}

export class CircuitEngine {
  simulate(circuit: Circuit, depth = 0): SimulationResult {
    if (depth > 6) {
      return this.buildDegradedResult(circuit);
    }

    const contactorPickup = this.computeContactorPickupFixpoint(circuit);
    const terminalGraph = this.buildTerminalGraph(
      circuit,
      null,
      contactorPickup
    );
    const potentials = this.propagatePotentials(circuit, terminalGraph);
    const nodes: Record<string, NodeResult> = {};
    const faults: FaultEvent[] = [];
    const defaultSingleVoltage =
      circuit.components.find((c) => c.type === 'power_source')?.properties
        .voltage || 230;

    for (const component of circuit.components) {
      const isOpen =
        component.state === 'off' ||
        component.state === 'tripped' ||
        component.state === 'fault';
      const hasPotential = this.componentTouchesAnyPotential(
        component,
        potentials
      );

      let energized = false;
      let currentA = 0;
      let voltageV = 0;
      let lineVoltageRmsV: number | undefined;
      let lineCurrentRmsA: number | undefined;
      let phaseVoltageRmsV: number | undefined;

      if (!isOpen) {
        if (this.isLoadComponent(component)) {
          energized = this.hasPolarityCorrectSupply(component, potentials);
          if (this.loadUsesBalancedThreePhaseMath(component)) {
            const serviceFactor = component.type === 'motor' ? 1.25 : 1;
            const r = this.balancedThreePhaseLineCurrentA(
              component,
              circuit,
              energized,
              serviceFactor
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
            const r = this.singleSuppliedThreePhaseMotorCurrentA(
              component,
              defaultSingleVoltage,
              energized
            );
            currentA = r.currentA;
            voltageV = r.voltageV;
            phaseVoltageRmsV = r.phaseVoltageRmsV;
            lineVoltageRmsV = component.properties.lineVoltage;
          } else {
            currentA = energized
              ? this.calculateCurrent(component, defaultSingleVoltage)
              : 0;
            voltageV = energized ? defaultSingleVoltage : 0;
          }
        } else {
          energized =
            hasPotential ||
            component.type === 'power_source' ||
            component.type === 'three_phase_source';
          if (component.type === 'three_phase_source') {
            const vLL =
              component.properties.lineVoltage ||
              component.properties.voltage ||
              400;
            voltageV = energized ? vLL : 0;
            lineVoltageRmsV = vLL;
            phaseVoltageRmsV = vLL / Math.sqrt(3);
          } else if (
            component.type === 'three_phase_contactor' ||
            component.type === 'four_phase_contactor'
          ) {
            const vLL =
              component.properties.lineVoltage ||
              this.getDefaultThreePhaseLineVoltage(circuit);
            voltageV = energized ? vLL : 0;
            lineVoltageRmsV = vLL;
            phaseVoltageRmsV = vLL / Math.sqrt(3);
          } else {
            voltageV = energized ? defaultSingleVoltage : 0;
          }
        }
      }

      const pf = this.getPowerFactor(component);
      const powerVA = this.loadUsesBalancedThreePhaseMath(component)
        ? (voltageV || 0) * currentA * Math.sqrt(3)
        : voltageV * currentA;
      const powerW = powerVA * pf;

      nodes[component.id] = {
        nodeId: component.id,
        voltageV,
        currentA,
        powerW,
        powerVA,
        powerFactor: pf,
        energized,
        lineVoltageRmsV,
        lineCurrentRmsA,
        phaseVoltageRmsV,
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
        nodes,
        contactorPickup
      );
      if (
        lnFaultAnchors.size > 0 &&
        this.seriesDeviceOnLivePathToLnFault(
          component,
          circuit,
          lnFaultAnchors,
          contactorPickup
        )
      ) {
        branchCurrent = Math.max(branchCurrent, prospectiveShortCurrentA);
      }
      seriesPathCurrents.set(component.id, branchCurrent);
      if (nodes[component.id]) {
        const pf = this.getPowerFactor(component);
        const vRef =
          component.type === 'three_phase_mcb' ||
          component.type === 'four_phase_mcb' ||
          component.type === 'three_phase_contactor' ||
          component.type === 'four_phase_contactor'
            ? component.properties.lineVoltage ||
              this.getDefaultThreePhaseLineVoltage(circuit)
            : defaultSingleVoltage;
        nodes[component.id] = {
          ...nodes[component.id],
          currentA: branchCurrent,
          powerVA: vRef * branchCurrent,
          powerW: vRef * branchCurrent * pf,
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

    let anyMotorThermal = false;
    for (const component of circuit.components) {
      if (!this.shouldCheckMotorThermalNameplate(component)) continue;
      if (!nodes[component.id]?.energized) continue;
      const rated = component.properties.ratedLineAmps!;
      const iLine = nodes[component.id].currentA;
      if (iLine <= rated * 1.15) continue;
      const tag =
        component.type === 'motor' ? 'Motor' : 'Three-phase motor';
      faults.push({
        id: crypto.randomUUID(),
        type: 'overload',
        affectedComponentId: component.id,
        message: `${tag} "${component.label}" overload: ${iLine.toFixed(2)}A exceeds ${rated}A nameplate`,
        severity: 'critical',
        timestamp: Date.now(),
      });
      component.state = 'fault';
      anyMotorThermal = true;
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

    if (anySeriesDeviceTripped || anyMotorThermal) {
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

  /**
   * Balanced three-phase active power P = √3 V_L-L I_L PF → I_L = P/(√3 V_L-L PF).
   * Driven by `phaseSystem` on `motor`; `three_phase_motor` uses this unless
   * explicitly set to single-phase (single-winding / single-supply model).
   */
  private loadUsesBalancedThreePhaseMath(c: CircuitComponent): boolean {
    const ps = c.properties.phaseSystem;
    if (c.type === 'three_phase_motor') return ps !== 'single_phase';
    if (c.type === 'motor') return ps === 'three_phase';
    return false;
  }

  /** Use L1/L2/L3 reachability for branch-current sums (true 3φ motor symbol). */
  private loadUsesThreePhaseBranchReachability(c: CircuitComponent): boolean {
    return (
      c.type === 'three_phase_motor' &&
      c.properties.phaseSystem !== 'single_phase'
    );
  }

  private balancedThreePhaseLineCurrentA(
    c: CircuitComponent,
    circuit: Circuit,
    energized: boolean,
    serviceFactor: number
  ): {
    currentA: number;
    voltageV: number;
    vLL: number;
    vPh: number;
  } {
    if (!energized)
      return { currentA: 0, voltageV: 0, vLL: 0, vPh: 0 };
    const vLL =
      c.properties.lineVoltage ||
      this.getDefaultThreePhaseLineVoltage(circuit);
    const pf = this.getPowerFactor(c);
    const p = c.properties.powerWatts || 0;
    const iLine =
      p > 0 ? (p / (Math.sqrt(3) * vLL * pf)) * serviceFactor : 0;
    return {
      currentA: iLine,
      voltageV: vLL,
      vLL,
      vPh: vLL / Math.sqrt(3),
    };
  }

  /** 3φ motor modeled on single-phase supply (one effective winding voltage). */
  private singleSuppliedThreePhaseMotorCurrentA(
    c: CircuitComponent,
    defaultSingleVoltage: number,
    energized: boolean
  ): {
    currentA: number;
    voltageV: number;
    phaseVoltageRmsV: number;
  } {
    if (!energized)
      return { currentA: 0, voltageV: 0, phaseVoltageRmsV: 0 };
    const vPh =
      c.properties.phaseVoltage ??
      (c.properties.lineVoltage != null
        ? c.properties.lineVoltage / Math.sqrt(3)
        : defaultSingleVoltage);
    const pf = this.getPowerFactor(c);
    const p = c.properties.powerWatts || 3000;
    const i = p > 0 ? (p / (vPh * pf)) * 1.25 : 0;
    return { currentA: i, voltageV: vPh, phaseVoltageRmsV: vPh };
  }

  private shouldCheckMotorThermalNameplate(c: CircuitComponent): boolean {
    const r = c.properties.ratedLineAmps;
    if (r === undefined || r <= 0) return false;
    if (c.type === 'three_phase_motor')
      return c.properties.phaseSystem !== 'single_phase';
    if (c.type === 'motor') return c.properties.phaseSystem === 'three_phase';
    return false;
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
      c.type === 'overload_relay' ||
      c.type === 'three_phase_mcb' ||
      c.type === 'four_phase_mcb'
    );
  }

  /**
   * NO: closed while pressed. NC: closed while not pressed.
   * If `pressed` is absent (older saves), fall back to latched `state === 'on'`.
   */
  private pushButtonConducting(c: CircuitComponent): boolean {
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

  private isSeriesPathComponent(c: CircuitComponent): boolean {
    return (
      c.type === 'switch' ||
      c.type === 'push_button' ||
      c.type === 'mcb' ||
      c.type === 'rcd' ||
      c.type === 'overload_relay' ||
      c.type === 'contactor' ||
      c.type === 'relay' ||
      c.type === 'timer' ||
      c.type === 'three_phase_mcb' ||
      c.type === 'four_phase_mcb' ||
      c.type === 'three_phase_contactor' ||
      c.type === 'four_phase_contactor'
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
    nodes: Record<string, NodeResult>,
    contactorPickup: Set<string>
  ): number {
    const graph = this.buildTerminalGraph(
      circuit,
      seriesDevice.id,
      contactorPickup
    );
    const lineStarts = this.getAllLineConductorStartKeys(circuit);
    const lineReach = this.bfsFrom(graph, lineStarts);

    let sum = 0;
    for (const comp of circuit.components) {
      if (!this.isLoadComponent(comp)) continue;
      const loadI = nodes[comp.id]?.currentA || 0;
      if (loadI <= 0) continue;
      if (this.loadUsesThreePhaseBranchReachability(comp)) {
        const k1 = this.findTerminalByLabel(comp, 'L1');
        const k2 = this.findTerminalByLabel(comp, 'L2');
        const k3 = this.findTerminalByLabel(comp, 'L3');
        if (!k1 || !k2 || !k3) continue;
        const allReach =
          lineReach.has(k1) && lineReach.has(k2) && lineReach.has(k3);
        if (!allReach) sum += loadI;
        continue;
      }
      const liveKey = this.getLoadLiveTerminalKey(comp);
      if (!liveKey) continue;
      if (!lineReach.has(liveKey)) {
        sum += loadI;
      }
    }
    return sum;
  }

  private getDefaultThreePhaseLineVoltage(circuit: Circuit): number {
    const src = circuit.components.find((c) => c.type === 'three_phase_source');
    return (
      src?.properties.lineVoltage ||
      src?.properties.voltage ||
      400
    );
  }

  private getAllLineConductorStartKeys(circuit: Circuit): string[] {
    return [
      ...this.getLiveStartKeys(circuit),
      ...this.getThreePhaseLineStartKeys(circuit, 1),
      ...this.getThreePhaseLineStartKeys(circuit, 2),
      ...this.getThreePhaseLineStartKeys(circuit, 3),
    ];
  }

  private getThreePhaseLineStartKeys(
    circuit: Circuit,
    phase: 1 | 2 | 3
  ): string[] {
    const keys: string[] = [];
    const token =
      phase === 1 ? 'L1' : phase === 2 ? 'L2' : 'L3';
    for (const source of circuit.components) {
      if (source.type !== 'three_phase_source') continue;
      if (source.state === 'off' || source.state === 'tripped') continue;
      for (const cp of source.connectionPoints) {
        const t = this.tokenizeLabel(cp.label);
        if (t.includes(token)) {
          keys.push(this.terminalKey(source.id, cp.id));
        }
      }
    }
    return keys;
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
      const fl = this.linePotentialAt(potentials, fk);
      const fn = potentials.neutral.has(fk);
      const tl = this.linePotentialAt(potentials, tk);
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
    faultLiveAnchors: Set<string>,
    contactorPickup: Set<string>
  ): boolean {
    if (faultLiveAnchors.size === 0) return false;
    const graphWithout = this.buildTerminalGraph(
      circuit,
      seriesDevice.id,
      contactorPickup
    );
    const liveStarts = this.getAllLineConductorStartKeys(circuit);
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

  private isCoilActuatedContactorType(type: string): boolean {
    return (
      type === 'contactor' ||
      type === 'relay' ||
      type === 'timer' ||
      type === 'three_phase_contactor' ||
      type === 'four_phase_contactor'
    );
  }

  /**
   * Coil picked up when A1 and A2 (or legacy COIL_A/B) sit on line and neutral
   * networks (either polarity).
   */
  private coilHasOperatingVoltage(
    component: CircuitComponent,
    potentials: PotentialSets
  ): boolean {
    const k1 =
      this.findTerminalByLabel(component, 'A1') ||
      this.findTerminalByLabel(component, 'COIL_A');
    const k2 =
      this.findTerminalByLabel(component, 'A2') ||
      this.findTerminalByLabel(component, 'COIL_B');
    if (!k1 || !k2) return false;
    const t1Live = this.linePotentialAt(potentials, k1);
    const t1N = potentials.neutral.has(k1);
    const t2Live = this.linePotentialAt(potentials, k2);
    const t2N = potentials.neutral.has(k2);
    return (t1Live && t2N) || (t1N && t2Live);
  }

  private pickupSetsEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    for (const id of a) {
      if (!b.has(id)) return false;
    }
    return true;
  }

  /**
   * Main poles close only when the coil sees live↔neutral. Iterates so a
   * downstream contactor can pick up after an upstream one closes.
   */
  private computeContactorPickupFixpoint(circuit: Circuit): Set<string> {
    let pickup = new Set<string>();
    for (let iter = 0; iter < 16; iter++) {
      const graph = this.buildTerminalGraph(circuit, null, pickup);
      const potentials = this.propagatePotentials(circuit, graph);
      const next = new Set<string>();
      for (const c of circuit.components) {
        if (!this.isCoilActuatedContactorType(c.type)) continue;
        if (this.coilHasOperatingVoltage(c, potentials)) {
          next.add(c.id);
        }
      }
      if (this.pickupSetsEqual(pickup, next)) {
        pickup = next;
        break;
      }
      pickup = next;
    }
    for (const c of circuit.components) {
      if (!this.isCoilActuatedContactorType(c.type)) continue;
      c.state = pickup.has(c.id) ? 'on' : 'off';
    }
    return pickup;
  }

  /**
   * @param omitInternalConnectionForComponentId When set, that component’s
   * IN↔OUT bridge is omitted (used to compute branch current through an MCB).
   * @param contactorPickupSet Main poles closed for these coil-actuated device ids.
   */
  private buildTerminalGraph(
    circuit: Circuit,
    omitInternalConnectionForComponentId?: string | null,
    contactorPickupSet?: Set<string> | null
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
        case 'push_button':
          if (this.pushButtonConducting(component) && !skipInternalBridge) {
            const inKey = this.findTerminalByLabel(component, 'IN');
            const outKey = this.findTerminalByLabel(component, 'OUT');
            if (inKey && outKey) this.addEdge(graph, inKey, outKey);
          }
          break;
        case 'switch':
        case 'rcd':
        case 'overload_relay':
          if (component.state === 'on' && !skipInternalBridge) {
            const inKey = this.findTerminalByLabel(component, 'IN');
            const outKey = this.findTerminalByLabel(component, 'OUT');
            if (inKey && outKey) this.addEdge(graph, inKey, outKey);
          }
          break;
        case 'mcb':
          if (component.state === 'on' && !skipInternalBridge) {
            const poles = component.properties.poles ?? 1;
            const is2p =
              poles >= 2 ||
              !!this.findTerminalByLabel(component, 'IN_L');
            if (is2p) {
              const polePairs: [string, string][] = [
                ['IN_L', 'OUT_L'],
                ['IN_N', 'OUT_N'],
              ];
              for (const [a, b] of polePairs) {
                const ak = this.findTerminalByLabel(component, a);
                const bk = this.findTerminalByLabel(component, b);
                if (ak && bk) this.addEdge(graph, ak, bk);
              }
            } else {
              const inKey = this.findTerminalByLabel(component, 'IN');
              const outKey = this.findTerminalByLabel(component, 'OUT');
              if (inKey && outKey) this.addEdge(graph, inKey, outKey);
            }
          }
          break;
        case 'contactor':
        case 'relay':
        case 'timer':
          if (
            !skipInternalBridge &&
            contactorPickupSet &&
            contactorPickupSet.has(component.id)
          ) {
            const inKey = this.findTerminalByLabel(component, 'IN');
            const outKey = this.findTerminalByLabel(component, 'OUT');
            if (inKey && outKey) this.addEdge(graph, inKey, outKey);
          }
          break;
        case 'three_phase_contactor':
        case 'four_phase_contactor':
          if (
            !skipInternalBridge &&
            contactorPickupSet &&
            contactorPickupSet.has(component.id)
          ) {
            const pairs: [string, string][] =
              component.type === 'four_phase_contactor'
                ? [
                    ['IN_L1', 'OUT_L1'],
                    ['IN_L2', 'OUT_L2'],
                    ['IN_L3', 'OUT_L3'],
                    ['IN_N', 'OUT_N'],
                  ]
                : [
                    ['IN_L1', 'OUT_L1'],
                    ['IN_L2', 'OUT_L2'],
                    ['IN_L3', 'OUT_L3'],
                  ];
            for (const [a, b] of pairs) {
              const ak = this.findTerminalByLabel(component, a);
              const bk = this.findTerminalByLabel(component, b);
              if (ak && bk) this.addEdge(graph, ak, bk);
            }
          }
          break;
        case 'three_phase_mcb':
        case 'four_phase_mcb':
          if (component.state === 'on' && !skipInternalBridge) {
            const pairs: [string, string][] =
              component.type === 'four_phase_mcb'
                ? [
                    ['IN_L1', 'OUT_L1'],
                    ['IN_L2', 'OUT_L2'],
                    ['IN_L3', 'OUT_L3'],
                    ['IN_N', 'OUT_N'],
                  ]
                : [
                    ['IN_L1', 'OUT_L1'],
                    ['IN_L2', 'OUT_L2'],
                    ['IN_L3', 'OUT_L3'],
                  ];
            for (const [a, b] of pairs) {
              const ak = this.findTerminalByLabel(component, a);
              const bk = this.findTerminalByLabel(component, b);
              if (ak && bk) this.addEdge(graph, ak, bk);
            }
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
    const l1Starts: string[] = [];
    const l2Starts: string[] = [];
    const l3Starts: string[] = [];

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

    for (const source of circuit.components) {
      if (source.type !== 'three_phase_source') continue;
      if (source.state === 'off' || source.state === 'tripped') continue;
      for (const cp of source.connectionPoints) {
        const key = this.terminalKey(source.id, cp.id);
        const tokens = this.tokenizeLabel(cp.label);
        if (tokens.includes('L1')) {
          l1Starts.push(key);
        } else if (tokens.includes('L2')) {
          l2Starts.push(key);
        } else if (tokens.includes('L3')) {
          l3Starts.push(key);
        } else if (tokens.includes('N') || tokens.includes('NEUTRAL')) {
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
      liveL1: this.bfsFrom(graph, l1Starts),
      liveL2: this.bfsFrom(graph, l2Starts),
      liveL3: this.bfsFrom(graph, l3Starts),
    };
  }

  private linePotentialAt(potentials: PotentialSets, key: string): boolean {
    return (
      potentials.live.has(key) ||
      potentials.liveL1.has(key) ||
      potentials.liveL2.has(key) ||
      potentials.liveL3.has(key)
    );
  }

  private componentTouchesAnyPotential(
    component: CircuitComponent,
    potentials: PotentialSets
  ): boolean {
    return component.connectionPoints.some((cp) => {
      const key = this.terminalKey(component.id, cp.id);
      return (
        this.linePotentialAt(potentials, key) ||
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

    for (const role of roles) {
      const key = this.terminalKey(component.id, role.pointId);
      if (role.phase === 1 && !potentials.liveL1.has(key)) return false;
      if (role.phase === 2 && !potentials.liveL2.has(key)) return false;
      if (role.phase === 3 && !potentials.liveL3.has(key)) return false;
      // Use any line network (1φ live or 3φ L1–L3), not only potentials.live
      if (role.needLive && !this.linePotentialAt(potentials, key)) return false;
      if (role.needNeutral && !potentials.neutral.has(key)) return false;
      if (role.needPe && !potentials.pe.has(key)) return false;
    }
    return true;
  }

  private getRequiredPolarityRoles(
    component: CircuitComponent
  ): {
    pointId: string;
    needLive: boolean;
    needNeutral: boolean;
    needPe: boolean;
    phase?: 1 | 2 | 3;
  }[] | null {
    switch (component.type) {
      case 'socket': {
        const out: {
          pointId: string;
          needLive: boolean;
          needNeutral: boolean;
          needPe: boolean;
          phase?: 1 | 2 | 3;
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
      case 'three_phase_motor': {
        const l1 = component.connectionPoints.find(
          (cp) => cp.label.toUpperCase() === 'L1'
        );
        const l2 = component.connectionPoints.find(
          (cp) => cp.label.toUpperCase() === 'L2'
        );
        const l3 = component.connectionPoints.find(
          (cp) => cp.label.toUpperCase() === 'L3'
        );
        const n = component.connectionPoints.find(
          (cp) => cp.label.toUpperCase() === 'N'
        );
        if (!l1 || !l2 || !l3 || !n) return null;
        return [
          { pointId: l1.id, needLive: false, needNeutral: false, needPe: false, phase: 1 },
          { pointId: l2.id, needLive: false, needNeutral: false, needPe: false, phase: 2 },
          { pointId: l3.id, needLive: false, needNeutral: false, needPe: false, phase: 3 },
          { pointId: n.id, needLive: false, needNeutral: true, needPe: false },
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
      if (this.linePotentialAt(potentials, key)) hasLive = true;
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
      case 'three_phase_motor':
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
    if (
      component.type === 'mcb' ||
      component.type === 'three_phase_mcb' ||
      component.type === 'four_phase_mcb'
    ) {
      const tag =
        component.type === 'three_phase_mcb'
          ? '3P MCB'
          : component.type === 'four_phase_mcb'
            ? '4P MCB'
            : component.type === 'mcb' &&
                ((component.properties.poles ?? 1) >= 2 ||
                  this.findTerminalByLabel(component, 'IN_L'))
              ? '2P MCB'
              : 'MCB';
      if (currentA > 1000) {
        return {
          id: crypto.randomUUID(),
          type: 'short_circuit',
          affectedComponentId: component.id,
          message: `${tag} "${component.label}" magnetic / short-circuit trip: ${currentA.toFixed(0)}A`,
          severity: 'critical',
          timestamp: Date.now(),
        };
      }
      if (p.ratingAmps && currentA > p.ratingAmps) {
        return {
          id: crypto.randomUUID(),
          type: 'overload',
          affectedComponentId: component.id,
          message: `${tag} "${component.label}" overloaded: ${currentA.toFixed(1)}A exceeds ${p.ratingAmps}A rating`,
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
        this.linePotentialAt(potentials, fromKey) ||
        this.linePotentialAt(potentials, toKey) ||
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
