import { describe, expect, it } from 'vitest';
import type { Circuit, CircuitComponent, ConnectionPoint } from '../../types';
import {
  deriveEndpointWireNumber,
  formatTerminalTag,
  refreshAutoWireNumbers,
} from '../wireEndpointNumbering';

function cp(id: string, componentId: string, label: string): ConnectionPoint {
  return { id, componentId, x: 0, y: 0, label };
}

function comp(
  id: string,
  type: CircuitComponent['type'],
  label: string,
  points: ConnectionPoint[]
): CircuitComponent {
  return {
    id,
    type,
    label,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    state: 'on',
    selected: false,
    connectionPoints: points,
    properties: {},
  };
}

describe('formatTerminalTag', () => {
  it('compactens underscored labels', () => {
    expect(formatTerminalTag('L_OUT')).toBe('Lout');
    expect(formatTerminalTag('L_IN')).toBe('Lin');
  });
});

describe('deriveEndpointWireNumber through connection_point', () => {
  it('labels branch from tap using upstream device', () => {
    const q1 = comp('q1', 'switch', 'Q1', [
      cp('q1-out', 'q1', 'L_OUT'),
      cp('q1-in', 'q1', 'L_IN'),
    ]);
    const q2 = comp('q2', 'switch', 'Q2', [
      cp('q2-out', 'q2', 'L_OUT'),
      cp('q2-in', 'q2', 'L_IN'),
    ]);
    const q3 = comp('q3', 'switch', 'Q3', [
      cp('q3-out', 'q3', 'L_OUT'),
      cp('q3-in', 'q3', 'L_IN'),
    ]);
    const tap = comp('tap', 'connection_point', '', [cp('tap-j', 'tap', 'J')]);

    const circuit: Circuit = {
      id: 'c',
      name: 't',
      components: [q1, q2, q3, tap],
      wires: [
        {
          id: 'wa',
          fromComponentId: 'q1',
          fromPointId: 'q1-out',
          toComponentId: 'tap',
          toPointId: 'tap-j',
          points: [0, 0, 50, 0],
          color: 'brown',
          crossSection: 2.5,
          energized: false,
          currentAmps: 0,
          wireNumberAuto: true,
        },
        {
          id: 'wb',
          fromComponentId: 'tap',
          fromPointId: 'tap-j',
          toComponentId: 'q2',
          toPointId: 'q2-in',
          points: [50, 0, 100, 0],
          color: 'brown',
          crossSection: 2.5,
          energized: false,
          currentAmps: 0,
          wireNumberAuto: true,
        },
        {
          id: 'wc',
          fromComponentId: 'tap',
          fromPointId: 'tap-j',
          toComponentId: 'q3',
          toPointId: 'q3-in',
          points: [50, 0, 50, 40],
          color: 'brown',
          crossSection: 2.5,
          energized: false,
          currentAmps: 0,
          wireNumberAuto: true,
        },
      ],
      gridSize: 20,
      panX: 0,
      panY: 0,
      zoom: 1,
      createdAt: '',
      updatedAt: '',
    };

    expect(deriveEndpointWireNumber(circuit, circuit.wires[2])).toBe(
      'Q1Lout-Q3Lin'
    );
    expect(deriveEndpointWireNumber(circuit, circuit.wires[0])).toBe(
      'Q1Lout-Q2Lin'
    );

    const refreshed = refreshAutoWireNumbers(circuit);
    expect(refreshed.wires[2].wireNumber).toBe('Q1Lout-Q3Lin');
  });
});

function baseCircuit(
  components: CircuitComponent[],
  wires: Circuit['wires']
): Circuit {
  return {
    id: 'c',
    name: 't',
    components,
    wires,
    gridSize: 20,
    panX: 0,
    panY: 0,
    zoom: 1,
    createdAt: '',
    updatedAt: '',
  };
}

function switchPair(id: string, label: string): CircuitComponent {
  return comp(id, 'switch', label, [
    cp(`${id}-out`, id, 'L_OUT'),
    cp(`${id}-in`, id, 'L_IN'),
  ]);
}

function passthrough(
  id: string,
  type: 'junction' | 'connection_point'
): CircuitComponent {
  return comp(id, type, '', [cp(`${id}-t`, id, type === 'junction' ? 'T1' : 'J')]);
}

function autoWire(
  id: string,
  from: { c: string; p: string },
  to: { c: string; p: string },
  points: number[]
) {
  return {
    id,
    fromComponentId: from.c,
    fromPointId: from.p,
    toComponentId: to.c,
    toPointId: to.p,
    points,
    color: 'brown' as const,
    crossSection: 2.5,
    energized: false,
    currentAmps: 0,
    wireNumberAuto: true as const,
  };
}

describe('deriveEndpointWireNumber through chained passthrough nodes', () => {
  it('resolves a linear junction chain to the upstream and downstream devices', () => {
    const q1 = switchPair('q1', 'Q1');
    const j1 = passthrough('j1', 'junction');
    const j2 = passthrough('j2', 'junction');
    const q2 = switchPair('q2', 'Q2');

    const circuit = baseCircuit([q1, j1, j2, q2], [
      autoWire('w1', { c: 'q1', p: 'q1-out' }, { c: 'j1', p: 'j1-t' }, [
        0, 0, 40, 0,
      ]),
      autoWire('w2', { c: 'j1', p: 'j1-t' }, { c: 'j2', p: 'j2-t' }, [
        40, 0, 80, 0,
      ]),
      autoWire('w3', { c: 'j2', p: 'j2-t' }, { c: 'q2', p: 'q2-in' }, [
        80, 0, 120, 0,
      ]),
    ]);

    expect(deriveEndpointWireNumber(circuit, circuit.wires[2])).toBe(
      'Q1Lout-Q2Lin'
    );
  });

  it('resolves branches after a junction chain using the original feeder', () => {
    const q1 = switchPair('q1', 'Q1');
    const j1 = passthrough('j1', 'junction');
    const j2 = passthrough('j2', 'connection_point');
    const q2 = switchPair('q2', 'Q2');
    const q3 = switchPair('q3', 'Q3');

    const circuit = baseCircuit([q1, j1, j2, q2, q3], [
      autoWire('w1', { c: 'q1', p: 'q1-out' }, { c: 'j1', p: 'j1-t' }, [
        0, 0, 40, 0,
      ]),
      autoWire('w2', { c: 'j1', p: 'j1-t' }, { c: 'j2', p: 'j2-t' }, [
        40, 0, 80, 0,
      ]),
      autoWire('w3', { c: 'j2', p: 'j2-t' }, { c: 'q2', p: 'q2-in' }, [
        80, 0, 120, 0,
      ]),
      autoWire('w4', { c: 'j2', p: 'j2-t' }, { c: 'q3', p: 'q3-in' }, [
        80, 0, 80, 40,
      ]),
    ]);

    expect(deriveEndpointWireNumber(circuit, circuit.wires[2])).toBe(
      'Q1Lout-Q2Lin'
    );
    expect(deriveEndpointWireNumber(circuit, circuit.wires[3])).toBe(
      'Q1Lout-Q3Lin'
    );
  });

  it.each([
    { depth: 1, node: 'junction' as const },
    { depth: 2, node: 'junction' as const },
    { depth: 3, node: 'connection_point' as const },
    { depth: 4, node: 'junction' as const },
  ])(
    'property: $depth-hop $node chain keeps Q1 as upstream ($depth)',
    ({ depth, node }) => {
      const q1 = switchPair('q1', 'Q1');
      const qEnd = switchPair('qEnd', 'Q9');
      const hops: CircuitComponent[] = [];
      const wires: Circuit['wires'] = [];

      for (let i = 0; i < depth; i++) {
        const id = `h${i}`;
        hops.push(passthrough(id, node));
      }

      const firstHop = hops[0];
      if (!firstHop) throw new Error('expected first hop');

      let x = 0;
      wires.push(
        autoWire(
          'w0',
          { c: 'q1', p: 'q1-out' },
          { c: firstHop.id, p: `${firstHop.id}-t` },
          [x, 0, x + 40, 0]
        )
      );
      x += 40;

      for (let i = 0; i < depth - 1; i++) {
        const from = hops[i];
        const to = hops[i + 1];
        if (!from || !to) throw new Error('hop chain length mismatch');
        wires.push(
          autoWire(
            `w${i + 1}`,
            { c: from.id, p: `${from.id}-t` },
            { c: to.id, p: `${to.id}-t` },
            [x, 0, x + 40, 0]
          )
        );
        x += 40;
      }

      const last = hops[depth - 1];
      if (!last) throw new Error('expected last hop');
      wires.push(
        autoWire(
          'wEnd',
          { c: last.id, p: `${last.id}-t` },
          { c: 'qEnd', p: 'qEnd-in' },
          [x, 0, x + 40, 0]
        )
      );

      const circuit = baseCircuit([q1, ...hops, qEnd], wires);
      const tail = circuit.wires[circuit.wires.length - 1];
      if (!tail) throw new Error('expected tail wire');
      expect(deriveEndpointWireNumber(circuit, tail)).toBe('Q1Lout-Q9Lin');

      const twice = refreshAutoWireNumbers(refreshAutoWireNumbers(circuit));
      const tailTwice = twice.wires[twice.wires.length - 1];
      if (!tailTwice) throw new Error('expected tail wire after refresh');
      expect(tailTwice.wireNumber).toBe('Q1Lout-Q9Lin');
    }
  );
});
