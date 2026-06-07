import { describe, expect, it } from 'vitest';
import { EXAMPLE_CIRCUITS } from '../exampleCircuits';
import { engine } from '../../simulation/engine';
import { buildSimulationEnergizationSnapshot } from '../../simulation/simulationSnapshot';

describe('example circuit simulation snapshots', () => {
  for (const entry of EXAMPLE_CIRCUITS) {
    it(`matches energization snapshot for "${entry.name}"`, () => {
      const circuit = entry.build();
      const result = engine.simulate(circuit, 0, 1_700_000_000_000);
      const snapshot = buildSimulationEnergizationSnapshot(circuit, result);
      expect(snapshot).toMatchSnapshot();
    });
  }
});
