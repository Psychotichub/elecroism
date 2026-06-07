import { describe, expect, it } from 'vitest';
import { analyzeConnectionIntegrity } from '../connectionIntegrity';
import { makeCircuit, makeComponent, wire } from '../../simulation/__tests__/testHelpers';

describe('analyzeConnectionIntegrity', () => {
  it('flags unwired terminals', () => {
    const src = makeComponent('power_source', { label: 'SRC' });
    const mcb = makeComponent('mcb', { label: 'Q1' });
    const circuit = makeCircuit([src, mcb], [
      wire(src, 'L_OUT', mcb, '1'),
    ]);
    const summary = analyzeConnectionIntegrity(circuit);
    expect(summary.unwiredTerminalCount).toBeGreaterThan(0);
    expect(summary.issues.some((i) => i.kind === 'unwired_terminal')).toBe(true);
  });

  it('flags floating wire ends when endpoint is missing', () => {
    const src = makeComponent('power_source', { label: 'SRC' });
    const w = wire(src, 'L_OUT', src, 'N_OUT');
    w.toComponentId = 'missing-id';
    const circuit = makeCircuit([src], [w]);
    const summary = analyzeConnectionIntegrity(circuit);
    expect(summary.floatingWireEndCount).toBe(1);
  });

  it('counts junctions', () => {
    const j = makeComponent('junction', { label: 'J1' });
    const circuit = makeCircuit([j], []);
    const summary = analyzeConnectionIntegrity(circuit);
    expect(summary.junctionCount).toBe(1);
  });
});
