import { describe, expect, it } from 'vitest';
import { buildCanvasStressCircuit } from '../../utils/canvasStressCircuit';
import { buildTerminalGraph } from '../terminalGraph';
import {
  TerminalGraphCache,
  computeCircuitTopologyKey,
  componentBridgeSignature,
} from '../terminalGraphCache';
import { makeComponent, wire, makeCircuit } from './testHelpers';

function graphEdgeCount(graph: Map<string, Set<string>>): number {
  let n = 0;
  for (const neighbors of graph.values()) {
    n += neighbors.size;
  }
  return n / 2;
}

describe('terminalGraphCache', () => {
  it('produces the same connectivity as an uncached build', () => {
    const src = makeComponent('power_source');
    const mcb = makeComponent('mcb', { state: 'on' });
    const lamp = makeComponent('lamp', { props: { powerWatts: 60 } });
    const j1 = makeComponent('junction');
    const j2 = makeComponent('junction');
    const circuit = makeCircuit(
      [src, mcb, lamp, j1, j2],
      [
        wire(src, 'L_OUT', j1, 'T1'),
        wire(j1, 'T1', mcb, '1'),
        wire(mcb, '2', lamp, 'T1'),
        wire(lamp, 'T2', j2, 'T1'),
        wire(j2, 'T1', src, 'N_OUT'),
      ]
    );

    const cache = new TerminalGraphCache();
    const pickup = new Set<string>();
    const cached = cache.build(circuit, null, pickup);
    const direct = buildTerminalGraph(circuit, null, pickup);

    expect(graphEdgeCount(cached)).toBe(graphEdgeCount(direct));
  });

  it('reuses skeleton across pickup fixpoint iterations', () => {
    const circuit = buildCanvasStressCircuit(120);
    const cache = new TerminalGraphCache();
    const topo = computeCircuitTopologyKey(circuit);

    const g0 = cache.buildForPickupIteration(circuit, new Set());
    const g1 = cache.buildForPickupIteration(circuit, new Set(['km1']));
    const g0b = cache.buildForPickupIteration(circuit, new Set());

    expect(computeCircuitTopologyKey(circuit)).toBe(topo);
    expect(graphEdgeCount(g0)).toBe(graphEdgeCount(g0b));
    expect(graphEdgeCount(g1)).toBeGreaterThanOrEqual(graphEdgeCount(g0));
  });

  it('incrementally patches a single device toggle', () => {
    const mcb = makeComponent('mcb', { id: 'mcb1', state: 'on' });
    const lamp = makeComponent('lamp');
    const src = makeComponent('power_source');
    const j1 = makeComponent('junction');
    const j2 = makeComponent('junction');
    const onCircuit = makeCircuit(
      [src, mcb, lamp, j1, j2],
      [
        wire(src, 'L_OUT', j1, 'T1'),
        wire(j1, 'T1', mcb, '1'),
        wire(mcb, '2', lamp, 'T1'),
        wire(lamp, 'T2', j2, 'T1'),
        wire(j2, 'T1', src, 'N_OUT'),
      ]
    );

    const cache = new TerminalGraphCache();
    const pickup = new Set<string>();
    const onGraph = cache.build(onCircuit, null, pickup);

    const offCircuit = {
      ...onCircuit,
      components: onCircuit.components.map((c) =>
        c.id === 'mcb1' ? { ...c, state: 'off' as const } : c
      ),
    };
    const offMcb = offCircuit.components.find((c) => c.id === 'mcb1');
    if (!offMcb) throw new Error('expected mcb');
    expect(componentBridgeSignature(mcb)).not.toBe(
      componentBridgeSignature(offMcb)
    );

    const offGraph = cache.build(offCircuit, null, pickup);
    expect(graphEdgeCount(offGraph)).toBeLessThan(graphEdgeCount(onGraph));
  });

  it('reuses cached graph on repeated 500-component builds', () => {
    const circuit = buildCanvasStressCircuit(500);
    const cache = new TerminalGraphCache();
    const pickup = new Set<string>();

    const first = cache.build(circuit, null, pickup);
    const second = cache.build(circuit, null, pickup);

    expect(graphEdgeCount(first)).toBeGreaterThan(0);
    expect(graphEdgeCount(second)).toBe(graphEdgeCount(first));
  });
});
