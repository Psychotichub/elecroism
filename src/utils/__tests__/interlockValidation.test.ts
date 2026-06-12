import { describe, expect, it } from 'vitest';
import { makeComponent, wire, makeCircuit } from '../../simulation/__tests__/testHelpers';
import { runCircuitDesignValidation } from '../circuitDesignValidation';

describe('Interlocking Safety Validation', () => {
  it('detects missing mechanical interlock warning for Forward-Reverse contactors', () => {
    const kmFwd = makeComponent('contactor', { label: 'KM_FWD' });
    const kmRev = makeComponent('contactor', { label: 'KM_REV' });
    const circuit = makeCircuit([kmFwd, kmRev], []);

    const issues = runCircuitDesignValidation(circuit, null);
    const missingWarning = issues.find(
      (iss) =>
        iss.id.includes('contactor-pair-missing-interlock') &&
        iss.message.includes('Forward-Reverse')
    );
    expect(missingWarning).toBeTruthy();
    expect(missingWarning?.severity).toBe('warning');
  });

  it('detects missing mechanical interlock warning for Star-Delta contactors', () => {
    const kmStar = makeComponent('contactor', { label: 'KM-STAR' });
    const kmDelta = makeComponent('contactor', { label: 'KM-DELTA' });
    const circuit = makeCircuit([kmStar, kmDelta], []);

    const issues = runCircuitDesignValidation(circuit, null);
    const missingWarning = issues.find(
      (iss) =>
        iss.id.includes('contactor-pair-missing-interlock') &&
        iss.message.includes('Star-Delta')
    );
    expect(missingWarning).toBeTruthy();
    expect(missingWarning?.severity).toBe('warning');
  });

  it('detects no missing mechanical interlock warning if a mechanical_interlock links them', () => {
    const kmFwd = makeComponent('contactor', { label: 'KM_FWD' });
    const kmRev = makeComponent('contactor', { label: 'KM_REV' });
    const interlock = makeComponent('mechanical_interlock', {
      label: 'IL1',
      props: {
        interlockContactorId1: kmFwd.id,
        interlockContactorId2: kmRev.id,
      },
    });
    const circuit = makeCircuit([kmFwd, kmRev, interlock], []);

    const issues = runCircuitDesignValidation(circuit, null);
    const missingWarning = issues.find((iss) =>
      iss.id.includes('contactor-pair-missing-interlock')
    );
    expect(missingWarning).toBeFalsy();
  });

  it('detects physical collision / short circuit error when both Forward-Reverse contactors are energized', () => {
    const src = makeComponent('power_source');
    const kmFwd = makeComponent('contactor', { label: 'KM_FWD' });
    const kmRev = makeComponent('contactor', { label: 'KM_REV' });

    // Wire both contactor coils in parallel to the source so they both energize
    const wires = [
      wire(src, 'L_OUT', kmFwd, 'A1'),
      wire(kmFwd, 'A2', src, 'N_OUT'),
      wire(src, 'L_OUT', kmRev, 'A1'),
      wire(kmRev, 'A2', src, 'N_OUT'),
    ];

    const circuit = makeCircuit([src, kmFwd, kmRev], wires);
    const issues = runCircuitDesignValidation(circuit, null);

    const collisionErr = issues.find((iss) =>
      iss.id.includes('contactor-pair-collision')
    );
    expect(collisionErr).toBeTruthy();
    expect(collisionErr?.severity).toBe('error');
    expect(collisionErr?.message).toContain('energized simultaneously');
  });

  it('detects mechanical interlock collision error when both linked contactors are energized', () => {
    const src = makeComponent('power_source');
    const km1 = makeComponent('contactor', { label: 'KM1' });
    const km2 = makeComponent('contactor', { label: 'KM2' });
    const interlock = makeComponent('mechanical_interlock', {
      label: 'IL1',
      props: {
        interlockContactorId1: km1.id,
        interlockContactorId2: km2.id,
      },
    });

    const wires = [
      wire(src, 'L_OUT', km1, 'A1'),
      wire(km1, 'A2', src, 'N_OUT'),
      wire(src, 'L_OUT', km2, 'A1'),
      wire(km2, 'A2', src, 'N_OUT'),
    ];

    const circuit = makeCircuit([src, km1, km2, interlock], wires);
    const issues = runCircuitDesignValidation(circuit, null);

    const collisionErr = issues.find((iss) =>
      iss.id.includes('mech-interlock-collision')
    );
    expect(collisionErr).toBeTruthy();
    expect(collisionErr?.severity).toBe('error');
    expect(collisionErr?.message).toContain('closed simultaneously under mechanical interlock');
  });

  it('detects door interlock safety warning when panel door is open but switch is closed', () => {
    const door = makeComponent('door_interlock', { label: 'Door1', state: 'off' });
    const mcb = makeComponent('mcb', { label: 'Q1', state: 'on' });
    const circuit = makeCircuit([door, mcb], []);

    const issues = runCircuitDesignValidation(circuit, null);
    const doorWarning = issues.find((iss) =>
      iss.id.includes('door-interlock-warning')
    );
    expect(doorWarning).toBeTruthy();
    expect(doorWarning?.severity).toBe('warning');
    expect(doorWarning?.message).toContain('Safety Interlock: Panel door');
  });

  it('detects key interlock safety warning when key is removed but switch is closed', () => {
    const key = makeComponent('key_interlock', {
      label: 'Key1',
      state: 'off',
      props: { keyInterlockSwitchId: 'mcb-id' },
    });
    const mcb = makeComponent('mcb', { id: 'mcb-id', label: 'Q1', state: 'on' });
    const circuit = makeCircuit([key, mcb], []);

    const issues = runCircuitDesignValidation(circuit, null);
    const keyWarning = issues.find((iss) =>
      iss.id.includes('key-interlock-warning')
    );
    expect(keyWarning).toBeTruthy();
    expect(keyWarning?.severity).toBe('warning');
    expect(keyWarning?.message).toContain('Key Interlock: Key is removed/open');
  });
});
