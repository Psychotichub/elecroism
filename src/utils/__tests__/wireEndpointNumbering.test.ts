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
