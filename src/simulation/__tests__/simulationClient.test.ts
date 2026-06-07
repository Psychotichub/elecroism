import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getSimulationRuntimeMode,
  resetSimulationRuntimeForTests,
  supportsSimulationWorker,
} from '../simulationClient';

describe('simulationClient runtime mode', () => {
  afterEach(() => {
    resetSimulationRuntimeForTests();
    vi.unstubAllGlobals();
  });

  it('reports main-thread when Worker is unavailable', () => {
    vi.stubGlobal('Worker', undefined);
    expect(supportsSimulationWorker()).toBe(false);
    expect(getSimulationRuntimeMode()).toBe('main-thread');
  });

  it('reports worker mode when Worker is available', () => {
    class FakeWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      postMessage() {
        // no-op
      }
      terminate() {
        // no-op
      }
    }
    vi.stubGlobal('Worker', FakeWorker);
    expect(getSimulationRuntimeMode()).toBe('worker');
  });
});
