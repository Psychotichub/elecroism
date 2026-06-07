import {
  applyPatches,
  enablePatches,
  produceWithPatches,
} from 'immer';
import type { BmsSimLogEntry, Circuit, HistoryEntry } from '../types';

enablePatches();

/** Reconstruct circuit state at a given history index (0 = baseline snapshot). */
export function circuitAtHistoryIndex(
  history: HistoryEntry[],
  index: number
): Circuit {
  if (index < 0 || history.length === 0) {
    throw new RangeError('Invalid history index');
  }
  const base = history[0];
  if (!base.circuit) {
    throw new Error('History baseline missing circuit snapshot');
  }
  let circuit = structuredClone(base.circuit);
  for (let i = 1; i <= index; i++) {
    const entry = history[i];
    if (!entry?.patches?.length) continue;
    circuit = applyPatches(circuit, entry.patches);
  }
  return circuit;
}

export function appendHistoryEntry(
  history: HistoryEntry[],
  historyIndex: number,
  nextCircuit: Circuit,
  bmsSimLog: BmsSimLogEntry[],
  description: string,
  maxSize: number
): { history: HistoryEntry[]; historyIndex: number } {
  const trimmed = history.slice(0, historyIndex + 1);
  const logCopy = structuredClone(bmsSimLog);

  if (trimmed.length === 0) {
    const entry: HistoryEntry = {
      description,
      bmsSimLog: logCopy,
      circuit: structuredClone(nextCircuit),
    };
    const newHistory = [entry].slice(-maxSize);
    return { history: newHistory, historyIndex: newHistory.length - 1 };
  }

  const prev = circuitAtHistoryIndex(trimmed, trimmed.length - 1);
  const [, patches, inversePatches] = produceWithPatches(prev, () =>
    structuredClone(nextCircuit)
  );

  const entry: HistoryEntry = {
    description,
    bmsSimLog: logCopy,
    patches: patches,
    inversePatches: inversePatches,
  };

  const newHistory = [...trimmed, entry].slice(-maxSize);
  return { history: newHistory, historyIndex: newHistory.length - 1 };
}

export function undoHistoryStep(
  history: HistoryEntry[],
  historyIndex: number,
  currentCircuit: Circuit
): { circuit: Circuit; historyIndex: number } | null {
  if (historyIndex <= 0) return null;
  const entry = history[historyIndex];
  if (!entry?.inversePatches?.length) return null;
  return {
    circuit: applyPatches(currentCircuit, entry.inversePatches),
    historyIndex: historyIndex - 1,
  };
}

export function redoHistoryStep(
  history: HistoryEntry[],
  historyIndex: number,
  currentCircuit: Circuit
): { circuit: Circuit; historyIndex: number } | null {
  if (historyIndex >= history.length - 1) return null;
  const nextIndex = historyIndex + 1;
  const entry = history[nextIndex];
  if (!entry?.patches?.length) return null;
  return {
    circuit: applyPatches(currentCircuit, entry.patches),
    historyIndex: nextIndex,
  };
}

export function initialHistorySnapshot(
  circuit: Circuit,
  bmsSimLog: BmsSimLogEntry[],
  description = 'Initial state'
): { history: HistoryEntry[]; historyIndex: number } {
  return {
    history: [
      {
        description,
        bmsSimLog: structuredClone(bmsSimLog),
        circuit: structuredClone(circuit),
      },
    ],
    historyIndex: 0,
  };
}
