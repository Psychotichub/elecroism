import type { Circuit, SimulationResult } from '../types';
import { engine } from './engine';
import {
  buildSimulationTimeline,
  type TimelineOptions,
  type TimelineSample,
} from './transientTimeline';
import type { WorkerRequest, WorkerResponse } from './simulationWorker';

export type SimulationRuntimeMode = 'worker' | 'main-thread';

let worker: Worker | null = null;
let workerDisabled = false;
let seq = 0;
const pending = new Map<
  number,
  { resolve: (v: unknown) => void; reject: (e: Error) => void }
>();

function workerAvailable(): boolean {
  return typeof Worker !== 'undefined';
}

/** Whether the browser exposes Web Workers at all. */
export function supportsSimulationWorker(): boolean {
  return workerAvailable();
}

/** Where simulation currently runs (worker thread vs main thread fallback). */
export function getSimulationRuntimeMode(): SimulationRuntimeMode {
  if (!workerAvailable() || workerDisabled) return 'main-thread';
  return 'worker';
}

function markWorkerUnavailable(): void {
  workerDisabled = true;
  for (const [, p] of pending) {
    p.reject(new Error('Simulation worker failed'));
  }
  pending.clear();
  worker?.terminate();
  worker = null;
}

function getWorker(): Worker | null {
  if (!workerAvailable() || workerDisabled) return null;
  if (!worker) {
    try {
      worker = new Worker(
        new URL('./simulationWorker.ts', import.meta.url),
        { type: 'module' }
      );
    } catch {
      markWorkerUnavailable();
      return null;
    }
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data;
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      if (msg.type === 'error') {
        p.reject(new Error(msg.message));
        return;
      }
      if (msg.type === 'simulate') p.resolve(msg.result);
      else if (msg.type === 'timeline') p.resolve(msg.samples);
    };
    worker.onerror = () => {
      markWorkerUnavailable();
    };
  }
  return worker;
}

function postSimulate(
  circuit: Circuit,
  wallMs: number,
  simStepMs = 0,
  atsSequenceTimeMs = 0
): Promise<SimulationResult> {
  const w = getWorker();
  const id = ++seq;
  const overrides =
    simStepMs > 0 || atsSequenceTimeMs > 0
      ? { simStepMs, atsSequenceTimeMs }
      : undefined;
  if (!w) {
    return Promise.resolve(
      engine.simulate(structuredClone(circuit), 0, wallMs, overrides)
    );
  }
  return new Promise<SimulationResult>((resolve, reject) => {
    pending.set(id, {
      resolve: resolve as (v: unknown) => void,
      reject,
    });
    const msg: WorkerRequest = {
      id,
      type: 'simulate',
      circuit,
      wallMs,
      simStepMs,
      atsSequenceTimeMs,
    };
    w.postMessage(msg);
  });
}

function postTimeline(
  circuit: Circuit,
  opts?: TimelineOptions
): Promise<TimelineSample[]> {
  const w = getWorker();
  const id = ++seq;
  if (!w) {
    return Promise.resolve(
      buildSimulationTimeline(structuredClone(circuit), opts)
    );
  }
  return new Promise<TimelineSample[]>((resolve, reject) => {
    pending.set(id, {
      resolve: resolve as (v: unknown) => void,
      reject,
    });
    const msg: WorkerRequest = {
      id,
      type: 'timeline',
      circuit,
      durationMs: opts?.durationMs,
      stepMs: opts?.stepMs,
      startWallMs: opts?.startWallMs,
      scenario: opts?.scenario,
      faultDeviceId: opts?.faultDeviceId,
    };
    w.postMessage(msg);
  });
}

export function simulateCircuitAsync(
  circuit: Circuit,
  wallMs = Date.now(),
  simStepMs = 0,
  atsSequenceTimeMs = 0
): Promise<SimulationResult> {
  return postSimulate(circuit, wallMs, simStepMs, atsSequenceTimeMs);
}

export function buildTimelineAsync(
  circuit: Circuit,
  opts?: TimelineOptions
): Promise<TimelineSample[]> {
  return postTimeline(circuit, opts);
}

export function terminateSimulationWorker(): void {
  worker?.terminate();
  worker = null;
  pending.clear();
}

/** Test helper — reset worker failure latch between cases. */
export function resetSimulationRuntimeForTests(): void {
  workerDisabled = false;
  terminateSimulationWorker();
}
