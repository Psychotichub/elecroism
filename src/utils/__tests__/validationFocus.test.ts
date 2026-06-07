/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { makeCircuit, makeComponent, wire } from '../../simulation/__tests__/testHelpers';
import type { CircuitValidationIssue } from '../circuitDesignValidation';
import {
  validationMarkersForIssues,
  viewportForValidationIssue,
  wireMidpoint,
} from '../validationFocus';

describe('validationFocus', () => {
  it('places a marker on a component issue', () => {
    const mcb = makeComponent('mcb', { id: 'm1', label: 'Q1' });
    const circuit = makeCircuit([mcb], []);
    const issues: CircuitValidationIssue[] = [
      {
        id: 'test-mcb',
        severity: 'warning',
        message: 'Test',
        componentIds: ['m1'],
      },
    ];
    const markers = validationMarkersForIssues(circuit, issues);
    expect(markers).toHaveLength(1);
    expect(markers[0]?.x).toBe(mcb.x);
    expect(markers[0]?.y).toBe(mcb.y);
  });

  it('frames a wire issue by midpoint', () => {
    const src = makeComponent('power_source', { id: 's1' });
    const lamp = makeComponent('lamp', { id: 'l1' });
    const w = wire(src, 'L_OUT', lamp, 'T1');
    w.points = [100, 100, 300, 200];
    const circuit = makeCircuit([src, lamp], [w]);
    const issue: CircuitValidationIssue = {
      id: 'wire-vdrop-x',
      severity: 'warning',
      message: 'Drop',
      componentIds: [],
      wireIds: [w.id],
    };
    const mid = wireMidpoint(w);
    expect(mid.x).toBe(200);
    expect(mid.y).toBe(150);
    const vp = viewportForValidationIssue(circuit, issue);
    expect(vp?.zoom).toBeGreaterThan(0);
    const markers = validationMarkersForIssues(circuit, [issue]);
    expect(markers[0]?.x).toBe(mid.x);
  });
});
