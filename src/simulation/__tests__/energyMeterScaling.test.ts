import { describe, expect, it, beforeEach } from 'vitest';
import { CircuitEngine } from '../engine';
import { makeComponent, wire, makeCircuit } from './testHelpers';

describe('Energy Meter Scaling', () => {
  let engine: CircuitEngine;

  beforeEach(() => {
    engine = new CircuitEngine();
  });

  it('Test 1: Meter in CT mode connected to a 100/5A CT scales a 2.5A terminal current to 50A', () => {
    const src = makeComponent('power_source', { props: { voltage: 230 } });
    const meter = makeComponent('energy_meter', {
      props: {
        meterConnectionMode: 'ct',
        phaseSystem: 'single_phase',
      },
    });
    const ct = makeComponent('current_transformer', {
      props: {
        meterCtPrimary: 100,
      },
    });
    const load = makeComponent('generic_load', {
      props: {
        powerWatts: 575, // 230V * 2.5A = 575W
        powerFactor: 1,
        phaseSystem: 'single_phase',
      },
    });

    const circuit = makeCircuit(
      [src, meter, ct, load],
      [
        // Source L to Meter 1
        wire(src, 'L_OUT', meter, '1'),
        // Meter 2 to Load T1
        wire(meter, '2', load, 'T1'),
        // Load T2 to Source N
        wire(load, 'T2', src, 'N_OUT'),
        // Connect CT secondary to meter's L1 terminal to trigger detection
        wire(ct, 'SEC_S1', meter, '1'),
      ]
    );

    const result = engine.simulate(circuit);
    expect(result.success).toBe(true);

    const node = result.nodes[meter.id];
    expect(node).toBeDefined();
    expect(node.energized).toBe(true);

    // Terminal current should be 2.5A, CT ratio is 100 / 5 = 20
    // Scaled current = 2.5 * 20 = 50A
    expect(node.currentA).toBeCloseTo(50, 1);
    expect(node.currentL1A).toBeCloseTo(50, 1);
  });

  it('Test 2: Meter in VT mode connected to a 400/110V VT scales a 110V terminal voltage to 400V', () => {
    const src = makeComponent('power_source', { props: { voltage: 110 } });
    const meter = makeComponent('energy_meter', {
      props: {
        meterConnectionMode: 'direct',
        phaseSystem: 'single_phase',
        lineVoltage: 110,
      },
    });
    const vt = makeComponent('voltage_transformer', {
      props: {
        phaseVoltage: 400, // primary
        voltage: 110,      // secondary
      },
    });
    const load = makeComponent('generic_load', {
      props: {
        powerWatts: 110, // 110V * 1A = 110W
        powerFactor: 1,
        phaseSystem: 'single_phase',
      },
    });

    const circuit = makeCircuit(
      [src, meter, vt, load],
      [
        wire(src, 'L_OUT', meter, '1'),
        wire(meter, '2', load, 'T1'),
        wire(load, 'T2', src, 'N_OUT'),
        // Connect VT secondary to meter's L1 and Neutral terminals for detection
        wire(vt, 'SEC_L', meter, '1'),
        wire(vt, 'SEC_N', meter, '7'),
      ]
    );

    const result = engine.simulate(circuit);
    expect(result.success).toBe(true);

    const node = result.nodes[meter.id];
    expect(node).toBeDefined();
    expect(node.energized).toBe(true);

    // VT ratio is 400 / 110 ≈ 3.636
    // Scaled voltage = 110 * 3.636 = 400V
    expect(node.voltageV).toBeCloseTo(400, 1);
  });

  it('Test 3: Meter with both CT and VT enabled scales active power correctly', () => {
    const src = makeComponent('power_source', { props: { voltage: 110 } });
    const meter = makeComponent('energy_meter', {
      props: {
        meterConnectionMode: 'ct',
        meterVtEnabled: true,
        meterVtPrimary: 400,
        meterVtSecondary: 110,
        phaseSystem: 'single_phase',
        lineVoltage: 110,
        powerFactor: 0.9,
      },
    });
    const ct = makeComponent('current_transformer', {
      props: {
        meterCtPrimary: 100,
      },
    });
    const load = makeComponent('generic_load', {
      props: {
        powerWatts: 247.5, // 110V * 2.5A * 0.9 = 247.5W
        powerFactor: 0.9,
        phaseSystem: 'single_phase',
      },
    });

    const circuit = makeCircuit(
      [src, meter, ct, load],
      [
        wire(src, 'L_OUT', meter, '1'),
        wire(meter, '2', load, 'T1'),
        wire(load, 'T2', src, 'N_OUT'),
        wire(ct, 'SEC_S1', meter, '1'),
      ]
    );

    const result = engine.simulate(circuit);
    expect(result.success).toBe(true);

    const node = result.nodes[meter.id];
    expect(node).toBeDefined();

    // CT ratio = 100 / 5 = 20. Terminal current = 2.5A. Scaled current = 50A.
    // VT ratio = 400 / 110. Terminal voltage = 110V. Scaled voltage = 400V.
    // Scaled Apparent Power (VA) = 400V * 50A = 20000 VA.
    // Scaled Active Power (W) = 20000 VA * 0.9 PF = 18000 W.
    expect(node.currentA).toBeCloseTo(50, 0);
    expect(node.voltageV).toBeCloseTo(400, 0);
    expect(node.powerVA).toBeCloseTo(20000, -1);
    expect(node.powerW).toBeCloseTo(18000, -1);
  });
});
