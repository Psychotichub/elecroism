import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  STRESS_COMPONENT_COUNT,
  measureSimulationStressMs,
} from '../simulationStress';

describe('performanceBudget', () => {
  it(`records main-thread simulate time on ${STRESS_COMPONENT_COUNT}-component stress circuit`, () => {
    const simulateStressMs = measureSimulationStressMs();
    expect(simulateStressMs).toBeGreaterThan(0);
    expect(simulateStressMs).toBeLessThan(120_000);

    const outPath = process.env.PERF_OUTPUT;
    if (outPath) {
      writeFileSync(
        outPath,
        JSON.stringify({ simulateStressMs }, null, 2) + '\n'
      );
    }
  });
});
