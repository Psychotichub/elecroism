import { describe, expect, it } from 'vitest';
import { CircuitEngine } from '../../simulation/engine';
import { explainWhyDeenergized } from '../whyIsOff';
import { makeCircuit, makeComponent, wire } from '../../simulation/__tests__/testHelpers';

describe('explainWhyDeenergized', () => {
  const engine = new CircuitEngine();

  it('returns null for energized load', () => {
    const src = makeComponent('power_source', { label: 'SRC', state: 'on' });
    const mcb = makeComponent('mcb', { label: 'Q1', state: 'on' });
    const lamp = makeComponent('lamp', { label: 'H1', state: 'on' });
    const circuit = makeCircuit(
      [src, mcb, lamp],
      [
        wire(src, 'L_OUT', mcb, '1'),
        wire(mcb, '2', lamp, 'T1'),
        wire(src, 'N_OUT', lamp, 'T2'),
      ]
    );
    const result = engine.simulate(circuit);
    expect(explainWhyDeenergized(circuit, lamp.id, result)).toBeNull();
  });

  it('explains MCB off upstream of lamp', () => {
    const src = makeComponent('power_source', { label: 'SRC', state: 'on' });
    const mcb = makeComponent('mcb', { label: 'Q1', state: 'off' });
    const lamp = makeComponent('lamp', { label: 'H1', state: 'on' });
    const circuit = makeCircuit(
      [src, mcb, lamp],
      [
        wire(src, 'L_OUT', mcb, '1'),
        wire(mcb, '2', lamp, 'T1'),
        wire(src, 'N_OUT', lamp, 'T2'),
      ]
    );
    const result = engine.simulate(circuit);
    const msg = explainWhyDeenergized(circuit, lamp.id, result);
    expect(msg).toBeTruthy();
    expect(msg!.toLowerCase()).toMatch(/q1|off/);
  });

  it('explains unwired terminals on selected device', () => {
    const lamp = makeComponent('lamp', { label: 'H1', state: 'on' });
    const circuit = makeCircuit([lamp], []);
    const result = engine.simulate(circuit);
    const msg = explainWhyDeenergized(circuit, lamp.id, result);
    expect(msg).toMatch(/unwired terminal/i);
  });
});
