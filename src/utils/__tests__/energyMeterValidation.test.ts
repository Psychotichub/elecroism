import { describe, expect, it } from 'vitest';
import { validateMeteringConnections } from '../circuitDesignValidation';
import { makeComponent, makeCircuit, wire } from '../../simulation/__tests__/testHelpers';

describe('Energy Meter Validation', () => {
  it('Test 1: CT ratio mismatch triggers a warning', () => {
    const src = makeComponent('power_source');
    const meter = makeComponent('energy_meter', {
      props: {
        meterConnectionMode: 'ct',
        meterCtPrimary: 200, // configured for 200A
        phaseSystem: 'single_phase',
      },
    });
    const ct = makeComponent('current_transformer', {
      props: {
        meterCtPrimary: 100, // CT is actually 100A
      },
    });
    const load = makeComponent('generic_load');

    const circuit = makeCircuit(
      [src, meter, ct, load],
      [
        wire(src, 'L_OUT', meter, '1'),
        wire(meter, '2', load, 'T1'),
        wire(load, 'T2', src, 'N_OUT'),
        wire(ct, 'SEC_S1', meter, '1'),
      ]
    );

    const issues = validateMeteringConnections(circuit);
    const issue = issues.find((i) => i.id.startsWith('meter-ct-mismatch-'));
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('warning');
    expect(issue!.message).toContain('CT ratio mismatch');
    expect(issue!.message).toContain('configured for CT primary of 200 A, but connected CT');
  });

  it('Test 2: Direct connection with high current (>10A) triggers an overcurrent warning', () => {
    const src = makeComponent('power_source', { props: { voltage: 230 } });
    const meter = makeComponent('energy_meter', {
      props: {
        meterConnectionMode: 'direct',
        phaseSystem: 'single_phase',
        lineVoltage: 230,
      },
    });
    const load = makeComponent('generic_load', {
      props: {
        powerWatts: 3450, // 230V * 15A = 3450W (>10A)
        powerFactor: 1,
        phaseSystem: 'single_phase',
      },
    });

    const circuit = makeCircuit(
      [src, meter, load],
      [
        wire(src, 'L_OUT', meter, '1'),
        wire(meter, '2', load, 'T1'),
        wire(load, 'T2', src, 'N_OUT'),
      ]
    );

    const issues = validateMeteringConnections(circuit);
    const issue = issues.find((i) => i.id.startsWith('meter-direct-high-current-'));
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('warning');
    expect(issue!.message).toContain('Direct connection warning');
    expect(issue!.message).toContain('exceeds the direct-connection recommended limit (10 A)');
  });

  it('Test 3: CT mode with no CT connected triggers a warning', () => {
    const src = makeComponent('power_source');
    const meter = makeComponent('energy_meter', {
      props: {
        meterConnectionMode: 'ct',
        phaseSystem: 'single_phase',
      },
    });
    const load = makeComponent('generic_load');

    const circuit = makeCircuit(
      [src, meter, load],
      [
        wire(src, 'L_OUT', meter, '1'),
        wire(meter, '2', load, 'T1'),
        wire(load, 'T2', src, 'N_OUT'),
      ]
    );

    const issues = validateMeteringConnections(circuit);
    const issue = issues.find((i) => i.id.startsWith('meter-ct-mode-direct-wired-'));
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('warning');
    expect(issue!.message).toContain('configured for CT connection, but is wired directly without any Current Transformers');
  });

  it('Test 4: Unwired CT secondary triggers a warning', () => {
    const ct = makeComponent('current_transformer');
    // Wire only the primary
    const src = makeComponent('power_source');
    const load = makeComponent('generic_load');
    const circuit = makeCircuit(
      [src, ct, load],
      [
        wire(src, 'L_OUT', ct, 'PRI_P1'),
        wire(ct, 'PRI_P2', load, 'T1'),
        wire(load, 'T2', src, 'N_OUT'),
      ]
    );

    const issues = validateMeteringConnections(circuit);
    const issue = issues.find((i) => i.id.startsWith('ct-sec-unwired-'));
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('warning');
    expect(issue!.message).toContain('secondary terminals S1/S2 are not fully wired');
  });
});
