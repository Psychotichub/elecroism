import { describe, expect, it } from 'vitest';
import { CircuitEngine } from '../engine';
import {
  effectiveImpedanceOhms,
  wireLengthMeters,
} from '../cableImpedance';
import { makeCircuit, makeComponent, wire } from './testHelpers';

describe('cableImpedance', () => {
  it('computes wire length from polyline and grid', () => {
    const len = wireLengthMeters([0, 0, 400, 0], 20);
    expect(len).toBeGreaterThan(0);
  });

  it('larger cross-section has lower impedance', () => {
    const z25 = effectiveImpedanceOhms(2.5, 30, 0.9);
    const z10 = effectiveImpedanceOhms(10, 30, 0.9);
    expect(z10).toBeLessThan(z25);
  });
});

describe('impedance load flow', () => {
  const engine = new CircuitEngine();

  it('reduces load voltage on a long thin cable vs short thick cable', () => {
    function buildCircuit(cross: number, lineLen: number) {
      const src = makeComponent('power_source', { label: 'SRC', state: 'on' });
      const mcb = makeComponent('mcb', { label: 'Q1', state: 'on' });
      const lamp = makeComponent('lamp', {
        label: 'H1',
        state: 'on',
        props: { powerWatts: 2000, powerFactor: 1 },
      });
      const c = makeCircuit(
        [src, mcb, lamp],
        [
          wire(src, 'L_OUT', mcb, '1', { crossSection: cross }),
          wire(mcb, '2', lamp, 'T1', { crossSection: cross }),
          wire(src, 'N_OUT', lamp, 'T2', { crossSection: cross }),
        ]
      );
      c.wires[0].points = [0, 0, lineLen, 0];
      c.wires[1].points = [lineLen, 0, lineLen * 2, 0];
      c.gridSize = 20;
      return { circuit: c, lampId: lamp.id };
    }

    const longCase = buildCircuit(1.5, 2000);
    const shortCase = buildCircuit(10, 80);

    const rLong = engine.simulate(structuredClone(longCase.circuit));
    const rShort = engine.simulate(structuredClone(shortCase.circuit));

    const vLong = rLong.nodes[longCase.lampId]?.voltageV ?? 0;
    const vShort = rShort.nodes[shortCase.lampId]?.voltageV ?? 0;
    expect(vLong).toBeGreaterThan(0);
    expect(vShort).toBeGreaterThan(vLong);
    expect(rLong.loadFlowMaxVoltageDropPct ?? 0).toBeGreaterThan(
      rShort.loadFlowMaxVoltageDropPct ?? 0
    );
  });

  it('parallel feeders from one MCB: shorter branch keeps higher load voltage', () => {
    const src = makeComponent('power_source', { label: 'SRC', state: 'on' });
    const mcb = makeComponent('mcb', { label: 'Q1', state: 'on' });
    const lampNear = makeComponent('lamp', {
      label: 'H_NEAR',
      state: 'on',
      props: { powerWatts: 1000, powerFactor: 1 },
    });
    const lampFar = makeComponent('lamp', {
      label: 'H_FAR',
      state: 'on',
      props: { powerWatts: 1000, powerFactor: 1 },
    });
    const circuit = makeCircuit(
      [src, mcb, lampNear, lampFar],
      [
        wire(src, 'L_OUT', mcb, '1', { crossSection: 10 }),
        wire(mcb, '2', lampNear, 'T1', { crossSection: 10 }),
        wire(mcb, '2', lampFar, 'T1', { crossSection: 1.5 }),
        wire(src, 'N_OUT', lampNear, 'T2', { crossSection: 10 }),
        wire(src, 'N_OUT', lampFar, 'T2', { crossSection: 1.5 }),
      ]
    );
    circuit.wires[2].points = [200, 0, 2200, 0];
    circuit.wires[4].points = [0, 40, 2200, 40];
    circuit.gridSize = 20;

    const cloned = structuredClone(circuit);
    const result = engine.simulate(cloned);
    const vNear = result.nodes[lampNear.id]?.voltageV ?? 0;
    const vFar = result.nodes[lampFar.id]?.voltageV ?? 0;
    expect(vNear).toBeGreaterThan(200);
    expect(vFar).toBeGreaterThan(200);
    const nearDrop = cloned.wires[1].voltageDropV ?? 0;
    const farDrop = cloned.wires[2].voltageDropV ?? 0;
    expect(farDrop).toBeGreaterThan(nearDrop);
  });
});
