import { describe, expect, it } from 'vitest';
import { EXAMPLE_CIRCUITS } from '../exampleCircuits';
import { engine } from '../../simulation/engine';

const LOAD_TYPES = new Set(['lamp', 'motor', 'three_phase_motor', 'heater']);

describe('example circuit simulation', () => {
  for (const entry of EXAMPLE_CIRCUITS) {
    it(`energizes "${entry.name}"`, () => {
      const circuit = entry.build();
      const result = engine.simulate(circuit, 0, Date.now());

      const loads = circuit.components.filter((c) => LOAD_TYPES.has(c.type));

      if (loads.length > 0) {
        const energizedLoads = loads.filter(
          (c) => result.nodes[c.id]?.energized
        );
        expect(
          energizedLoads.length,
          `${entry.name}: ${energizedLoads.length}/${loads.length} loads energized`
        ).toBe(loads.length);
      } else {
        // Control panel (no power loads): the SMPS / supply must be energized.
        const supplies = circuit.components.filter(
          (c) => c.type === 'smps' || c.type === 'power_source'
        );
        const energizedSupply = supplies.some(
          (c) => result.nodes[c.id]?.energized
        );
        expect(energizedSupply, `${entry.name}: no supply energized`).toBe(true);
      }

      // No example should present a short-circuit fault.
      expect(
        result.faults.some((f) => f.type === 'short_circuit'),
        `${entry.name}: unexpected short circuit`
      ).toBe(false);
    });
  }
});
