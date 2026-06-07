import { describe, expect, it } from 'vitest';
import type { Circuit, Wire } from '../../types';
import {
  bundleParallelWires,
  findBundlePeers,
  parseWireSegment,
  segmentsParallelOverlap,
  translateBundleSegment,
} from '../wireBundle';

function wire(id: string, points: number[]): Wire {
  return {
    id,
    fromComponentId: 'a',
    fromPointId: 'p1',
    toComponentId: 'b',
    toPointId: 'p2',
    points,
    color: 'brown',
    crossSection: 2.5,
    energized: false,
    currentAmps: 0,
  };
}

function miniCircuit(wires: Wire[]): Circuit {
  return {
    id: 'c',
    name: 't',
    components: [],
    wires,
    gridSize: 20,
    zoom: 1,
    panX: 0,
    panY: 0,
    createdAt: '',
    updatedAt: '',
  };
}

describe('wireBundle', () => {
  it('detects parallel overlapping segments', () => {
    const a = parseWireSegment([0, 100, 200, 100], 0)!;
    const b = parseWireSegment([40, 120, 180, 120], 0)!;
    expect(segmentsParallelOverlap(a, b)).toBe(true);
  });

  it('finds bundle peers on parallel wires', () => {
    const circuit = miniCircuit([
      wire('w1', [0, 100, 200, 100]),
      wire('w2', [0, 120, 200, 120]),
    ]);
    const peers = findBundlePeers(circuit, 'w1', 0);
    expect(peers).toHaveLength(1);
    expect(peers[0].wireId).toBe('w2');
  });

  it('translates bundle segments together', () => {
    const snapshot = new Map<string, number[]>([
      ['w1', [0, 100, 200, 100]],
      ['w2', [0, 120, 200, 120]],
    ]);
    const moved = translateBundleSegment(snapshot, 'w1', 0, 0, 20);
    expect(moved.get('w1')?.[1]).toBe(120);
    expect(moved.get('w2')?.[1]).toBe(140);
  });

  it('spaces parallel bundle evenly', () => {
    const circuit = miniCircuit([
      wire('w1', [0, 100, 200, 100]),
      wire('w2', [0, 140, 200, 140]),
    ]);
    const next = bundleParallelWires(circuit, 'w1', 20);
    const y1 = next.wires.find((w) => w.id === 'w1')!.points[1];
    const y2 = next.wires.find((w) => w.id === 'w2')!.points[1];
    expect(Math.abs(y2 - y1)).toBe(20);
  });
});
