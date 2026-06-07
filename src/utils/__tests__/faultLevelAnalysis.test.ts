import { describe, expect, it } from 'vitest';
import { CircuitEngine } from '../../simulation/engine';
import { makeCircuit, makeComponent, wire } from '../../simulation/__tests__/testHelpers';
import {
  buildFaultLevelReport,
  maxProspectiveFaultCurrentA,
} from '../faultLevelAnalysis';

describe('faultLevelAnalysis', () => {
  const engine = new CircuitEngine();

  it('reports higher fault current on short thick feeder than long thin', () => {
    function build(cross: number, lineLen: number) {
      const src = makeComponent('power_source', { label: 'SRC', state: 'on' });
      const mcb = makeComponent('mcb', {
        label: 'Q1',
        state: 'on',
        props: { ratingAmps: 16, tripCurve: 'C', breakingCapacity: 10000 },
      });
      const lamp = makeComponent('lamp', { label: 'H1', state: 'on' });
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
      return c;
    }

    const simShort = engine.simulate(structuredClone(build(10, 80)));
    const simLong = engine.simulate(structuredClone(build(1.5, 2000)));

    const shortReport = buildFaultLevelReport(build(10, 80), simShort);
    const longReport = buildFaultLevelReport(build(1.5, 2000), simLong);

    expect(shortReport[0]?.faultCurrentA).toBeGreaterThan(
      longReport[0]?.faultCurrentA ?? 0
    );
  });

  it('stores prospective fault levels on simulation result', () => {
    const src = makeComponent('power_source', { label: 'SRC', state: 'on' });
    const mcb = makeComponent('mcb', {
      label: 'Q1',
      state: 'on',
      props: { breakingCapacity: 10000 },
    });
    const circuit = makeCircuit(
      [src, mcb],
      [wire(src, 'L_OUT', mcb, '1')]
    );
    const result = engine.simulate(structuredClone(circuit));
    expect(result.maxProspectiveFaultA).toBeGreaterThan(100);
    expect(result.prospectiveFaultLevels?.[mcb.id]).toBeGreaterThan(100);
    expect(maxProspectiveFaultCurrentA(circuit, result)).toBe(
      result.maxProspectiveFaultA
    );
  });
});
