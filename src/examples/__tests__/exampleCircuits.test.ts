import { describe, expect, it } from 'vitest';
import { EXAMPLE_CIRCUITS } from '../exampleCircuits';

describe('example circuits', () => {
  for (const entry of EXAMPLE_CIRCUITS) {
    it(`builds "${entry.name}" without throwing and with valid wire endpoints`, () => {
      const circuit = entry.build();
      const byId = new Map(circuit.components.map((c) => [c.id, c]));

      for (const w of circuit.wires) {
        const from = byId.get(w.fromComponentId);
        const to = byId.get(w.toComponentId);
        expect(from, `wire ${w.id} from component`).toBeTruthy();
        expect(to, `wire ${w.id} to component`).toBeTruthy();
        expect(
          from!.connectionPoints.some((p) => p.id === w.fromPointId),
          `wire ${w.id} fromPointId on ${from!.type}`
        ).toBe(true);
        expect(
          to!.connectionPoints.some((p) => p.id === w.toPointId),
          `wire ${w.id} toPointId on ${to!.type}`
        ).toBe(true);
      }
    });
  }
});
