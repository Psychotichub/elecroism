import { buildCanvasStressCircuit } from '../utils/canvasStressCircuit';
import { engine } from '../simulation/engine';

/** Fixed stress sheet size for CI performance budgets. */
export const STRESS_COMPONENT_COUNT = 200;

const WARMUP_ITERATIONS = 1;
const MEASURE_ITERATIONS = 7;

/** Median main-thread `engine.simulate` time on the stress circuit (ms). */
export function measureSimulationStressMs(): number {
  const circuit = buildCanvasStressCircuit(STRESS_COMPONENT_COUNT);

  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    engine.simulate(structuredClone(circuit));
  }

  const samples: number[] = [];
  for (let i = 0; i < MEASURE_ITERATIONS; i++) {
    const t0 = performance.now();
    engine.simulate(structuredClone(circuit));
    samples.push(performance.now() - t0);
  }

  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)] ?? samples[0] ?? 0;
}
