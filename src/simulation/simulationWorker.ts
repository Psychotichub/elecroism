import type { Circuit } from '../types';
import { CircuitEngine } from './engine';
import { buildSimulationTimeline } from './transientTimeline';

const engine = new CircuitEngine();

export type WorkerRequest =
  | {
      id: number;
      type: 'simulate';
      circuit: Circuit;
      wallMs: number;
      simStepMs?: number;
      atsSequenceTimeMs?: number;
    }
  | {
      id: number;
      type: 'timeline';
      circuit: Circuit;
      durationMs?: number;
      stepMs?: number;
      startWallMs?: number;
      scenario?: 'normal' | 'fault_clearing' | 'ats_transfer';
      faultDeviceId?: string;
    };

export type WorkerResponse =
  | { id: number; type: 'simulate'; result: ReturnType<CircuitEngine['simulate']> }
  | {
      id: number;
      type: 'timeline';
      samples: ReturnType<typeof buildSimulationTimeline>;
    }
  | { id: number; type: 'error'; message: string };

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  try {
    if (msg.type === 'simulate') {
      const overrides =
        (msg.simStepMs != null && msg.simStepMs > 0) ||
        (msg.atsSequenceTimeMs != null && msg.atsSequenceTimeMs > 0)
          ? {
              simStepMs: msg.simStepMs ?? 0,
              atsSequenceTimeMs: msg.atsSequenceTimeMs ?? 0,
            }
          : undefined;
      const result = engine.simulate(
        structuredClone(msg.circuit),
        0,
        msg.wallMs,
        overrides
      );
      const response: WorkerResponse = { id: msg.id, type: 'simulate', result };
      self.postMessage(response);
      return;
    }
    if (msg.type === 'timeline') {
      const samples = buildSimulationTimeline(structuredClone(msg.circuit), {
        durationMs: msg.durationMs,
        stepMs: msg.stepMs,
        startWallMs: msg.startWallMs,
        scenario: msg.scenario,
        faultDeviceId: msg.faultDeviceId,
      });
      const response: WorkerResponse = { id: msg.id, type: 'timeline', samples };
      self.postMessage(response);
      return;
    }
  } catch (err) {
    const response: WorkerResponse = {
      id: msg.id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};
