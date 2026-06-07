import { describe, expect, it } from 'vitest';
import { CircuitEngine } from '../engine';
import {
  acPrimaryFundamentalCurrentA,
  sumDownstreamDcLoadPowerW,
} from '../chargerCoupling';
import { makeCircuit, makeComponent, wire } from './testHelpers';
import { buildTerminalGraph } from '../terminalGraph';
import { propagatePotentials } from '../potentials';

describe('chargerCoupling', () => {
  it('computes AC primary current from DC load power', () => {
    const smps = makeComponent('smps', {
      props: {
        voltage: 24,
        powerWatts: 120,
        supplyEfficiencyPercent: 88,
        inputPowerFactor: 0.65,
      },
    });
    const iAc = acPrimaryFundamentalCurrentA(smps, 48);
    expect(iAc).toBeGreaterThan(0.2);
    expect(iAc).toBeLessThan(0.5);
  });

  it('sums downstream DC load power on the charger bus', () => {
    const src = makeComponent('power_source', { state: 'on' });
    const smps = makeComponent('smps', { state: 'on', props: { voltage: 24 } });
    const lamp = makeComponent('lamp', { props: { powerWatts: 24 } });
    const wires = [
      wire(src, 'L_OUT', smps, 'AC_L'),
      wire(src, 'N_OUT', smps, 'AC_N'),
      wire(smps, 'DC_PLUS', lamp, 'T1', { color: 'red' }),
      wire(smps, 'DC_MINUS', lamp, 'T2', { color: 'black' }),
    ];
    const circuit = makeCircuit([src, smps, lamp], wires);
    const engine = new CircuitEngine();
    const result = engine.simulate(circuit);
    const graph = buildTerminalGraph(circuit);
    const pDc = sumDownstreamDcLoadPowerW(smps, circuit, graph, result.nodes);
    expect(pDc).toBeCloseTo(24, 0);
    expect(result.nodes[smps.id]?.fundamentalCurrentA ?? 0).toBeGreaterThan(0.1);
    expect(result.nodes[smps.id]?.dcOutputPowerW).toBeCloseTo(24, 0);
  });

  it('trips SMPS when DC load exceeds rated output power', () => {
    const src = makeComponent('power_source', { state: 'on' });
    const smps = makeComponent('smps', {
      state: 'on',
      props: { voltage: 24, powerWatts: 30 },
    });
    const lamp = makeComponent('lamp', { props: { powerWatts: 60 } });
    const wires = [
      wire(src, 'L_OUT', smps, 'AC_L'),
      wire(src, 'N_OUT', smps, 'AC_N'),
      wire(smps, 'DC_PLUS', lamp, 'T1', { color: 'red' }),
      wire(smps, 'DC_MINUS', lamp, 'T2', { color: 'black' }),
    ];
    const circuit = makeCircuit([src, smps, lamp], wires);
    const engine = new CircuitEngine();
    const result = engine.simulate(circuit);
    expect(circuit.components.find((c) => c.id === smps.id)?.state).toBe('tripped');
    expect(result.nodes[smps.id]?.energized).toBe(false);
    expect(result.nodes[lamp.id]?.energized).toBe(false);
    expect(result.faults.some((f) => f.type === 'overload')).toBe(true);
  });

  it('includes charger primary current on upstream AC series path', () => {
    const src = makeComponent('power_source', { state: 'on' });
    const fuse = makeComponent('mcb', {
      state: 'on',
      props: { ratingAmps: 10 },
    });
    const smps = makeComponent('smps', {
      state: 'on',
      props: { voltage: 24, powerWatts: 120 },
    });
    const lamp = makeComponent('lamp', { props: { powerWatts: 48 } });
    const wires = [
      wire(src, 'L_OUT', fuse, '1'),
      wire(fuse, '2', smps, 'AC_L'),
      wire(src, 'N_OUT', smps, 'AC_N'),
      wire(smps, 'DC_PLUS', lamp, 'T1', { color: 'red' }),
      wire(smps, 'DC_MINUS', lamp, 'T2', { color: 'black' }),
    ];
    const circuit = makeCircuit([src, fuse, smps, lamp], wires);
    const engine = new CircuitEngine();
    const result = engine.simulate(circuit);
    expect(result.nodes[fuse.id]?.currentA ?? 0).toBeGreaterThan(0.15);
  });

  it('de-energizes DC bus after overload trip', () => {
    const src = makeComponent('power_source', { state: 'on' });
    const smps = makeComponent('smps', {
      state: 'on',
      props: { voltage: 24, powerWatts: 20 },
    });
    const lamp = makeComponent('lamp', { props: { powerWatts: 40 } });
    const wires = [
      wire(src, 'L_OUT', smps, 'AC_L'),
      wire(src, 'N_OUT', smps, 'AC_N'),
      wire(smps, 'DC_PLUS', lamp, 'T1', { color: 'red' }),
      wire(smps, 'DC_MINUS', lamp, 'T2', { color: 'black' }),
    ];
    const circuit = makeCircuit([src, smps, lamp], wires);
    const engine = new CircuitEngine();
    const result = engine.simulate(circuit);
    expect(result.nodes[lamp.id]?.energized).toBe(false);
    const graph = buildTerminalGraph(circuit);
    const pots = propagatePotentials(circuit, graph);
    const lampL = lamp.connectionPoints.find((p) => p.label === 'T1')!;
    expect(pots.live.has(`${lamp.id}:${lampL.id}`)).toBe(false);
  });
});
