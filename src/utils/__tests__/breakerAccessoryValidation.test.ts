import { describe, expect, it } from 'vitest';
import { validateBreakerAccessories } from '../circuitDesignValidation';
import { makeComponent, makeCircuit, wire } from '../../simulation/__tests__/testHelpers';

describe('Breaker Accessory Validation', () => {
  it('Accessory with no parent ID raises warning', () => {
    const acc = makeComponent('shunt_trip_coil', { props: { breakerParentId: undefined } });
    const circuit = makeCircuit([acc], []);
    const issues = validateBreakerAccessories(circuit);

    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('is not linked to any breaker');
  });

  it('Accessory with non-existent parent raises error', () => {
    const acc = makeComponent('shunt_trip_coil', { props: { breakerParentId: 'ghost-id' } });
    const circuit = makeCircuit([acc], []);
    const issues = validateBreakerAccessories(circuit);

    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('references a parent breaker that no longer exists');
  });

  it('Accessory linked to non-breaker parent raises error', () => {
    const lamp = makeComponent('lamp');
    const acc = makeComponent('shunt_trip_coil', { props: { breakerParentId: lamp.id } });
    const circuit = makeCircuit([lamp, acc], []);
    const issues = validateBreakerAccessories(circuit);

    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('which is not an MCCB or ACB');
  });

  it('Unwired accessory raises info warning', () => {
    const breaker = makeComponent('mccb');
    const acc = makeComponent('shunt_trip_coil', { props: { breakerParentId: breaker.id } });
    const circuit = makeCircuit([breaker, acc], []);
    const issues = validateBreakerAccessories(circuit);

    // Should raise info for unwired
    const unwiredIssue = issues.find(i => i.id.startsWith('breaker-acc-unwired-'));
    expect(unwiredIssue).toBeTruthy();
    expect(unwiredIssue!.severity).toBe('info');
    expect(unwiredIssue!.message).toContain('has no wires');
  });

  it('Unwired UVR with ON parent breaker raises warning', () => {
    const breaker = makeComponent('mccb', { state: 'on' });
    const uvr = makeComponent('uvr_release', { props: { breakerParentId: breaker.id } });
    
    // Wire the breaker but NOT the UVR
    const src = makeComponent('power_source', { state: 'on' });
    const wires = [
      wire(src, 'L_OUT', breaker, '1'),
      wire(src, 'N_OUT', breaker, '2'),
    ];

    const circuit = makeCircuit([src, breaker, uvr], wires);
    const issues = validateBreakerAccessories(circuit);

    const uvrIssue = issues.find(i => i.id.startsWith('uvr-no-supply-'));
    expect(uvrIssue).toBeTruthy();
    expect(uvrIssue!.severity).toBe('warning');
    expect(uvrIssue!.message).toContain('breaker');
    expect(uvrIssue!.message).toContain('will drop open');
  });

  it('Wired Closing Coil fighting unwired UVR on same parent breaker raises warning', () => {
    const src = makeComponent('power_source', { state: 'on' });
    const breaker = makeComponent('mccb', { state: 'off' });
    const cc = makeComponent('closing_coil', { props: { breakerParentId: breaker.id } });
    const uvr = makeComponent('uvr_release', { props: { breakerParentId: breaker.id } });

    // Wire the closing coil, but leave UVR unwired
    const wires = [
      wire(src, 'L_OUT', cc, 'A1'),
      wire(src, 'N_OUT', cc, 'A2'),
    ];

    const circuit = makeCircuit([src, breaker, cc, uvr], wires);
    const issues = validateBreakerAccessories(circuit);

    const fightingIssue = issues.find(i => i.id.startsWith('cc-vs-uvr-'));
    expect(fightingIssue).toBeTruthy();
    expect(fightingIssue!.severity).toBe('warning');
    expect(fightingIssue!.message).toContain('cannot stay closed');
  });
});
