import { describe, expect, it } from 'vitest';
import type { Circuit } from '../../types';
import {
  appendHistoryEntry,
  circuitAtHistoryIndex,
  undoHistoryStep,
} from '../../store/circuitHistory';

function minimalCircuit(name: string): Circuit {
  return {
    id: 'c1',
    name,
    components: [],
    wires: [],
    gridSize: 20,
    panX: 0,
    panY: 0,
    zoom: 1,
    createdAt: '',
    updatedAt: '',
  };
}

describe('circuitHistory', () => {
  it('stores patch entries after baseline snapshot', () => {
    const c0 = minimalCircuit('A');
    const start = appendHistoryEntry([], -1, c0, [], 'start', 50);

    const c1 = { ...c0, name: 'B' };
    const step = appendHistoryEntry(
      start.history,
      start.historyIndex,
      c1,
      [],
      'rename',
      50
    );

    expect(step.history).toHaveLength(2);
    expect(step.history[1].patches?.length).toBeGreaterThan(0);
    expect(circuitAtHistoryIndex(step.history, 1).name).toBe('B');
  });

  it('undoes with inverse patches', () => {
    const c0 = minimalCircuit('A');
    const start = appendHistoryEntry([], -1, c0, [], 'start', 50);
    const c1 = { ...c0, name: 'B' };
    const step = appendHistoryEntry(
      start.history,
      start.historyIndex,
      c1,
      [],
      'rename',
      50
    );

    const undone = undoHistoryStep(step.history, step.historyIndex, c1);
    expect(undone?.circuit.name).toBe('A');
    expect(undone?.historyIndex).toBe(0);
  });
});
