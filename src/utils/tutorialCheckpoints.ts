import type { Circuit, ComponentType, SimulationResult } from '../types';

export type TutorialCheckpointContext = {
  circuit: Circuit;
  simulationResult: SimulationResult | null;
};

export function countComponents(
  circuit: Circuit,
  type: ComponentType
): number {
  return circuit.components.filter((c) => c.type === type).length;
}

export function hasComponentType(
  circuit: Circuit,
  type: ComponentType
): boolean {
  return countComponents(circuit, type) > 0;
}

export function terminalWireDegree(
  circuit: Circuit,
  componentId: string,
  pointLabel: string
): number {
  const comp = circuit.components.find((c) => c.id === componentId);
  const pt = comp?.connectionPoints.find((p) => p.label === pointLabel);
  if (!pt) return 0;
  let degree = 0;
  for (const w of circuit.wires) {
    if (
      (w.fromComponentId === componentId && w.fromPointId === pt.id) ||
      (w.toComponentId === componentId && w.toPointId === pt.id)
    ) {
      degree += 1;
    }
  }
  return degree;
}

export function typeTerminalWired(
  circuit: Circuit,
  type: ComponentType,
  pointLabel: string
): boolean {
  return circuit.components.some(
    (c) =>
      c.type === type && terminalWireDegree(circuit, c.id, pointLabel) > 0
  );
}

export function motorFullyWired(circuit: Circuit): boolean {
  return circuit.components
    .filter((c) => c.type === 'motor')
    .some(
      (m) =>
        terminalWireDegree(circuit, m.id, 'T1') > 0 &&
        terminalWireDegree(circuit, m.id, 'T2') > 0
    );
}

export function contactorCoilWired(circuit: Circuit): boolean {
  return circuit.components
    .filter((c) => c.type === 'contactor')
    .some(
      (k) =>
        terminalWireDegree(circuit, k.id, 'A1') > 0 &&
        terminalWireDegree(circuit, k.id, 'A2') > 0
    );
}

export function dolPowerPathWired(circuit: Circuit): boolean {
  return (
    circuit.wires.length >= 4 &&
    typeTerminalWired(circuit, 'power_source', 'L_OUT') &&
    typeTerminalWired(circuit, 'mcb', '1') &&
    typeTerminalWired(circuit, 'mcb', '2') &&
    typeTerminalWired(circuit, 'contactor', 'T1') &&
    typeTerminalWired(circuit, 'contactor', 'T2') &&
    motorFullyWired(circuit)
  );
}

export function dolNeutralAndCoilWired(circuit: Circuit): boolean {
  return (
    contactorCoilWired(circuit) &&
    (typeTerminalWired(circuit, 'power_source', 'N_OUT') ||
      typeTerminalWired(circuit, 'junction', 'T1'))
  );
}

export function motorEnergized(
  circuit: Circuit,
  simulationResult: SimulationResult | null
): boolean {
  if (!simulationResult?.success) return false;
  return circuit.components
    .filter((c) => c.type === 'motor')
    .some((m) => {
      const node = simulationResult.nodes[m.id];
      return node?.energized === true && (node.currentA ?? 0) > 0;
    });
}
