import { describe, expect, it } from 'vitest';
import { CircuitEngine } from '../engine';
import { computeResidualCurrentA, rcdPoleCount } from '../residualCurrent';
import { makeCircuit, makeComponent, wire } from './testHelpers';
import { buildTerminalGraph } from '../terminalGraph';
import { propagatePotentials } from '../potentials';

describe('residualCurrent', () => {
  it('rcdPoleCount detects 2P vs 4P layout', () => {
    const rcd2 = makeComponent('rcd', { props: { poles: 2 } });
    expect(rcdPoleCount(rcd2)).toBe(2);
    const rcd4 = makeComponent('rcd', {
      connectionPoints: [
        { id: 'a', componentId: 'x', x: 0, y: 0, label: '1' },
        { id: 'b', componentId: 'x', x: 0, y: 0, label: '2' },
        { id: 'c', componentId: 'x', x: 0, y: 0, label: '3' },
        { id: 'd', componentId: 'x', x: 0, y: 0, label: '4' },
        { id: 'e', componentId: 'x', x: 0, y: 0, label: '5' },
        { id: 'f', componentId: 'x', x: 0, y: 0, label: '6' },
        { id: 'g', componentId: 'x', x: 0, y: 0, label: '7' },
        { id: 'h', componentId: 'x', x: 0, y: 0, label: '8' },
      ],
      props: { poles: 4 },
    });
    expect(rcdPoleCount(rcd4)).toBe(4);
  });

  it('balanced single-phase load has near-zero residual', () => {
    const src = makeComponent('power_source', { state: 'on' });
    const rcd = makeComponent('rcd', { state: 'on', props: { rcdTripTimeMs: 0 } });
    const lamp = makeComponent('lamp', { props: { powerWatts: 60 } });
    const wires = [
      wire(src, 'L_OUT', rcd, '1'),
      wire(rcd, '2', lamp, 'T1'),
      wire(src, 'N_OUT', rcd, '3'),
      wire(rcd, '4', lamp, 'T2'),
    ];
    const circuit = makeCircuit([src, rcd, lamp], wires);
    const engine = new CircuitEngine();
    const result = engine.simulate(circuit);
    const graph = buildTerminalGraph(circuit);
    const pots = propagatePotentials(circuit, graph);
    const iRes = computeResidualCurrentA(rcd, circuit, result.nodes, graph, pots);
    expect(iRes).toBeLessThan(0.001);
    expect(circuit.components.find((c) => c.id === rcd.id)?.state).toBe('on');
  });

  it('trips RCD on downstream L–N fault via vector residual', () => {
    const src = makeComponent('power_source', { state: 'on' });
    const rcd = makeComponent('rcd', {
      state: 'on',
      props: { rcdSensitivity: 30, rcdTripTimeMs: 0 },
    });
    const jLive = makeComponent('junction', { label: 'J-L' });
    const jNeutral = makeComponent('junction', { label: 'J-N' });
    const wires = [
      wire(src, 'L_OUT', rcd, '1'),
      wire(rcd, '2', jLive, 'T1'),
      wire(src, 'N_OUT', rcd, '3'),
      wire(rcd, '4', jNeutral, 'T1'),
      wire(jLive, 'T1', jNeutral, 'T1'),
    ];
    const circuit = makeCircuit([src, rcd, jLive, jNeutral], wires);
    const engine = new CircuitEngine();
    const result = engine.simulate(circuit);
    expect(circuit.components.find((c) => c.id === rcd.id)?.state).toBe('tripped');
    expect(result.faults.some((f) => f.type === 'earth_fault')).toBe(true);
  });

  it('trips RCD when load return bypasses the neutral pole via MET', () => {
    const src = makeComponent('power_source', { state: 'on' });
    const rcd = makeComponent('rcd', {
      state: 'on',
      props: { rcdSensitivity: 30, rcdTripTimeMs: 0 },
    });
    const earthBar = makeComponent('earth_bar_grounding_system', {
      state: 'on',
      connectionPoints: [
        { id: 'eb1', componentId: 'eb', x: 0, y: 0, label: '1' },
        { id: 'eb2', componentId: 'eb', x: 0, y: 0, label: '2' },
      ],
    });
    const lamp = makeComponent('lamp', { props: { powerWatts: 60 } });
    const wires = [
      wire(src, 'L_OUT', rcd, '1'),
      wire(rcd, '2', lamp, 'T1'),
      wire(src, 'N_OUT', earthBar, '1'),
      wire(earthBar, '2', lamp, 'T2'),
    ];
    const circuit = makeCircuit([src, rcd, earthBar, lamp], wires);
    const engine = new CircuitEngine();
    const result = engine.simulate(circuit);
    expect(circuit.components.find((c) => c.id === rcd.id)?.state).toBe('tripped');
    expect(
      result.faults.some(
        (f) => f.type === 'earth_fault' && f.affectedComponentId === rcd.id
      )
    ).toBe(true);
  });

  it('trips ELR on vector residual when neutral return bypasses the device', () => {
    const src = makeComponent('power_source', { state: 'on' });
    const elr = makeComponent('earth_leakage_relay_cbct', {
      state: 'on',
      props: { earthLeakageTripMa: 30, elrTripDelayMs: 0, ratingAmps: 63 },
    });
    const earthBar = makeComponent('earth_bar_grounding_system', {
      state: 'on',
      connectionPoints: [
        { id: 'eb1', componentId: 'eb', x: 0, y: 0, label: '1' },
        { id: 'eb2', componentId: 'eb', x: 0, y: 0, label: '2' },
      ],
    });
    const lamp = makeComponent('lamp', { props: { powerWatts: 60 } });
    const wires = [
      wire(src, 'L_OUT', elr, '1'),
      wire(elr, '2', lamp, 'T1'),
      wire(src, 'N_OUT', earthBar, '1'),
      wire(earthBar, '2', lamp, 'T2'),
    ];
    const circuit = makeCircuit([src, elr, earthBar, lamp], wires);
    const engine = new CircuitEngine();
    const result = engine.simulate(circuit);
    expect(circuit.components.find((c) => c.id === elr.id)?.state).toBe('tripped');
    expect(
      result.faults.some(
        (f) => f.type === 'earth_fault' && f.affectedComponentId === elr.id
      )
    ).toBe(true);
  });
});
