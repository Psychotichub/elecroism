import { describe, expect, it } from 'vitest';
import { CircuitEngine } from '../../simulation/engine';
import {
  buildEarthFaultLoopReport,
  maxZsForMcb,
  validateEarthFaultLoop,
} from '../earthFaultLoopValidation';
import { makeCircuit, makeComponent, wire } from '../../simulation/__tests__/testHelpers';

describe('maxZsForMcb', () => {
  it('Type B allows higher Zs than Type C for same rating', () => {
    const zb = maxZsForMcb(16, 'B');
    const zc = maxZsForMcb(16, 'C');
    expect(zb).toBeGreaterThan(zc);
    expect(zb).toBeCloseTo(230 / (5 * 16), 2);
  });
});

describe('earth-fault loop validation', () => {
  const engine = new CircuitEngine();

  function buildFeeder(cross: number, lineLen: number) {
    const src = makeComponent('power_source', { label: 'SRC', state: 'on' });
    const mcb = makeComponent('mcb', {
      label: 'Q1',
      state: 'on',
      props: { ratingAmps: 16, tripCurve: 'B' },
    });
    const lamp = makeComponent('lamp', {
      label: 'H1',
      state: 'on',
      props: { powerWatts: 60 },
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
    c.wires[2].points = [0, 40, lineLen * 2, 40];
    c.gridSize = 20;
    return { circuit: c, lampId: lamp.id, mcbId: mcb.id };
  }

  it('short thick run passes Zs check', () => {
    const { circuit, lampId } = buildFeeder(10, 80);
    const sim = engine.simulate(structuredClone(circuit));
    const rows = buildEarthFaultLoopReport(circuit, sim);
    const row = rows.find((r) => r.loadId === lampId);
    expect(row).toBeDefined();
    expect(row!.ok).toBe(true);
    expect(validateEarthFaultLoop(circuit, sim).filter((i) => i.id.startsWith('zs-over'))).toHaveLength(0);
  });

  it('long thin run fails Zs check', () => {
    const { circuit, lampId } = buildFeeder(1.0, 8000);
    const sim = engine.simulate(structuredClone(circuit));
    const rows = buildEarthFaultLoopReport(circuit, sim);
    const row = rows.find((r) => r.loadId === lampId);
    expect(row).toBeDefined();
    expect(row!.zsOhms).toBeGreaterThan(row!.maxZsOhms ?? 0);
    expect(row!.ok).toBe(false);
    const issues = validateEarthFaultLoop(circuit, sim);
    expect(issues.some((i) => i.id === `zs-over-${lampId}`)).toBe(true);
  });
});
