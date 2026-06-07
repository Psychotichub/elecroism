/**
 * Simulation engine integration tests.
 *
 * Tests cover the four recommended scenarios from the project roadmap:
 *  1. Single-phase source → MCB → load (basic energization)
 *  2. Three-phase short circuit between L1/L2/L3
 *  3. BMS ACB close blocked by UVR
 *  4. Motorized MCCB close blocked by missing control voltage
 *
 * Plus additional coverage for:
 *  - MCB overload trip
 *  - Open switch de-energizes downstream load
 *  - Multiple loads summing correctly
 *  - Three-phase balanced motor current
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitEngine } from '../engine';
import { makeComponent, wire, makeCircuit } from './testHelpers';

let engine: CircuitEngine;

beforeEach(() => {
  engine = new CircuitEngine();
});

/* ================================================================== */
/*  1. BASIC ENERGIZATION                                              */
/* ================================================================== */

describe('Basic single-phase energization', () => {
  it('source → MCB(ON) → lamp produces correct V / I / P', () => {
    const src = makeComponent('power_source');
    const mcb = makeComponent('mcb', { state: 'on' });
    const lamp = makeComponent('lamp', { props: { powerWatts: 60, powerFactor: 1 } });
    const j1 = makeComponent('junction');
    const j2 = makeComponent('junction');

    const circuit = makeCircuit(
      [src, mcb, lamp, j1, j2],
      [
        // L path:  source L_OUT → junction → MCB → lamp T1
        wire(src, 'L_OUT', j1, 'T1'),
        wire(j1, 'T1', mcb, '1'),
        wire(mcb, '2', lamp, 'T1'),
        // N path:  lamp T2 → junction → source N_OUT
        wire(lamp, 'T2', j2, 'T1'),
        wire(j2, 'T1', src, 'N_OUT'),
      ]
    );

    const result = engine.simulate(circuit);

    expect(result.success).toBe(true);
    // Lamp is energized
    const lampNode = result.nodes[lamp.id];
    expect(lampNode).toBeDefined();
    expect(lampNode.energized).toBe(true);
    expect(lampNode.voltageV).toBeCloseTo(230, 0);
    // I = P / V = 60 / 230 ≈ 0.26 A
    expect(lampNode.currentA).toBeCloseTo(60 / 230, 1);
    expect(lampNode.powerW).toBeCloseTo(60, 0);
  });

  it('source → MCB(OFF) → lamp is NOT energized', () => {
    const src = makeComponent('power_source');
    const mcb = makeComponent('mcb', { state: 'off' });
    const lamp = makeComponent('lamp');
    const j1 = makeComponent('junction');
    const j2 = makeComponent('junction');

    const circuit = makeCircuit(
      [src, mcb, lamp, j1, j2],
      [
        wire(src, 'L_OUT', j1, 'T1'),
        wire(j1, 'T1', mcb, '1'),
        wire(mcb, '2', lamp, 'T1'),
        wire(lamp, 'T2', j2, 'T1'),
        wire(j2, 'T1', src, 'N_OUT'),
      ]
    );

    const result = engine.simulate(circuit);

    expect(result.success).toBe(true);
    expect(result.nodes[lamp.id].energized).toBe(false);
    expect(result.nodes[lamp.id].currentA).toBe(0);
  });

  it('open switch de-energizes downstream load', () => {
    const src = makeComponent('power_source');
    const sw = makeComponent('switch', { state: 'off' });
    const lamp = makeComponent('lamp');
    const j1 = makeComponent('junction');
    const j2 = makeComponent('junction');

    const circuit = makeCircuit(
      [src, sw, lamp, j1, j2],
      [
        wire(src, 'L_OUT', j1, 'T1'),
        wire(j1, 'T1', sw, '1'),
        wire(sw, '2', lamp, 'T1'),
        wire(lamp, 'T2', j2, 'T1'),
        wire(j2, 'T1', src, 'N_OUT'),
      ]
    );

    const result = engine.simulate(circuit);
    expect(result.nodes[lamp.id].energized).toBe(false);

    // Now close the switch
    sw.state = 'on';
    const result2 = engine.simulate(circuit);
    expect(result2.nodes[lamp.id].energized).toBe(true);
  });
});

/* ================================================================== */
/*  2. MCB OVERLOAD TRIP                                               */
/* ================================================================== */

describe('MCB overload trip', () => {
  it('16A C-curve MCB trips when load current exceeds threshold', () => {
    const src = makeComponent('power_source');
    // MCB rated 16A, C-curve → magnetic trip at 5-10x = 80-160A
    const mcb = makeComponent('mcb', {
      state: 'on',
      props: { ratingAmps: 16, tripCurve: 'C' },
    });
    // 5000W resistive load at 230V → ~21.7A > 16A (overload)
    const load = makeComponent('generic_load', {
      props: { powerWatts: 5000, loadType: 'resistive', powerFactor: 1 },
    });
    const j1 = makeComponent('junction');
    const j2 = makeComponent('junction');

    const circuit = makeCircuit(
      [src, mcb, load, j1, j2],
      [
        wire(src, 'L_OUT', j1, 'T1'),
        wire(j1, 'T1', mcb, '1'),
        wire(mcb, '2', load, 'T1'),
        wire(load, 'T2', j2, 'T1'),
        wire(j2, 'T1', src, 'N_OUT'),
      ]
    );

    const result = engine.simulate(circuit);

    // MCB should have tripped
    expect(mcb.state).toBe('tripped');
    expect(result.faults.length).toBeGreaterThan(0);
    const overloadFault = result.faults.find(
      (f) => f.type === 'overload' && f.affectedComponentId === mcb.id
    );
    expect(overloadFault).toBeDefined();
    // Load should now be de-energized after trip
    expect(result.nodes[load.id].energized).toBe(false);
  });

  it('16A MCB does NOT trip for 10A load', () => {
    const src = makeComponent('power_source');
    const mcb = makeComponent('mcb', {
      state: 'on',
      props: { ratingAmps: 16, tripCurve: 'C' },
    });
    // 2300W at 230V → 10A, well under 16A
    const load = makeComponent('generic_load', {
      props: { powerWatts: 2300, loadType: 'resistive', powerFactor: 1 },
    });
    const j1 = makeComponent('junction');
    const j2 = makeComponent('junction');

    const circuit = makeCircuit(
      [src, mcb, load, j1, j2],
      [
        wire(src, 'L_OUT', j1, 'T1'),
        wire(j1, 'T1', mcb, '1'),
        wire(mcb, '2', load, 'T1'),
        wire(load, 'T2', j2, 'T1'),
        wire(j2, 'T1', src, 'N_OUT'),
      ]
    );

    const result = engine.simulate(circuit);

    expect(mcb.state).toBe('on');
    expect(result.nodes[load.id].energized).toBe(true);
    expect(result.faults.filter((f) => f.affectedComponentId === mcb.id)).toHaveLength(0);
  });
});

/* ================================================================== */
/*  3. MULTIPLE LOADS                                                  */
/* ================================================================== */

describe('Multiple loads', () => {
  it('total power sums correctly across two parallel loads', () => {
    const src = makeComponent('power_source');
    const mcb = makeComponent('mcb', { state: 'on' });
    const lamp1 = makeComponent('lamp', {
      props: { powerWatts: 60, powerFactor: 1 },
    });
    const lamp2 = makeComponent('lamp', {
      props: { powerWatts: 100, powerFactor: 1 },
    });
    const j1 = makeComponent('junction');
    const j2 = makeComponent('junction');
    const j3 = makeComponent('junction');
    const j4 = makeComponent('junction');

    // Parallel topology:
    //   src.L → j1 → mcb → j3 → lamp1.T1
    //                        └→ lamp2.T1
    //   lamp1.T2 → j4, lamp2.T2 → j4 → j2 → src.N
    const circuit = makeCircuit(
      [src, mcb, lamp1, lamp2, j1, j2, j3, j4],
      [
        wire(src, 'L_OUT', j1, 'T1'),
        wire(j1, 'T1', mcb, '1'),
        wire(mcb, '2', j3, 'T1'),
        wire(j3, 'T1', lamp1, 'T1'),
        wire(j3, 'T1', lamp2, 'T1'),
        wire(lamp1, 'T2', j4, 'T1'),
        wire(lamp2, 'T2', j4, 'T1'),
        wire(j4, 'T1', j2, 'T1'),
        wire(j2, 'T1', src, 'N_OUT'),
      ]
    );

    const result = engine.simulate(circuit);

    expect(result.nodes[lamp1.id].energized).toBe(true);
    expect(result.nodes[lamp2.id].energized).toBe(true);
    // Total power ≈ 160W (60 + 100)
    expect(result.totalPowerW).toBeCloseTo(160, 0);
  });
});

/* ================================================================== */
/*  4. THREE-PHASE SHORT CIRCUIT                                       */
/* ================================================================== */

describe('Three-phase short circuit', () => {
  it('L1-L2-L3 shorted together produces a short-circuit fault', () => {
    const src = makeComponent('three_phase_source');
    const mcb = makeComponent('three_phase_mcb', { state: 'on' });
    // Junction acts as the short: connect all three phases to the same junction
    const jShort = makeComponent('junction');

    const circuit = makeCircuit(
      [src, mcb, jShort],
      [
        // Source to MCB
        wire(src, 'L1_OUT', mcb, '1'),
        wire(src, 'L2_OUT', mcb, '3'),
        wire(src, 'L3_OUT', mcb, '5'),
        // MCB output all to same junction = short
        wire(mcb, '2', jShort, 'T1'),
        wire(mcb, '4', jShort, 'T1'),
        wire(mcb, '6', jShort, 'T1'),
      ]
    );

    const result = engine.simulate(circuit);

    // Should detect a three-phase short circuit fault
    const scFault = result.faults.find((f) => f.type === 'short_circuit');
    expect(scFault).toBeDefined();
    expect(scFault!.severity).toBe('critical');
    expect(scFault!.message).toContain('Three-phase short circuit');
  });
});

/* ================================================================== */
/*  5. THREE-PHASE MOTOR — BALANCED CURRENT                            */
/* ================================================================== */

describe('Three-phase motor', () => {
  it('balanced 3φ motor shows correct line current', () => {
    const src = makeComponent('three_phase_source');
    const mcb = makeComponent('three_phase_mcb', { state: 'on' });
    const motor = makeComponent('three_phase_motor', {
      props: {
        powerWatts: 3000,
        powerFactor: 0.85,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
        ratedLineAmps: 10, // high enough to not trip
      },
    });

    // Connect neutral path too
    const jN = makeComponent('junction');

    const circuit = makeCircuit(
      [src, mcb, motor, jN],
      [
        // L1–L3 through MCB
        wire(src, 'L1_OUT', mcb, '1'),
        wire(src, 'L2_OUT', mcb, '3'),
        wire(src, 'L3_OUT', mcb, '5'),
        wire(mcb, '2', motor, 'L1'),
        wire(mcb, '4', motor, 'L2'),
        wire(mcb, '6', motor, 'L3'),
        // Neutral
        wire(motor, 'N', jN, 'T1'),
        wire(jN, 'T1', src, 'N_OUT'),
      ]
    );

    const result = engine.simulate(circuit);

    const motorNode = result.nodes[motor.id];
    expect(motorNode).toBeDefined();
    expect(motorNode.energized).toBe(true);

    // I_line = P / (√3 × V_LL × PF) = 3000 / (√3 × 400 × 0.85) ≈ 5.09A
    const expectedI = 3000 / (Math.sqrt(3) * 400 * 0.85);
    expect(motorNode.currentA).toBeCloseTo(expectedI, 1);
    expect(motorNode.lineVoltageRmsV).toBeCloseTo(400, 0);
  });
});

/* ================================================================== */
/*  6. BMS ACB — UVR INTERLOCK                                         */
/* ================================================================== */

describe('BMS ACB close blocked by UVR', () => {
  it('ACB with BMS enabled + UVR de-energized stays open', () => {
    const src = makeComponent('three_phase_source');
    const acb = makeComponent('air_circuit_breaker', {
      state: 'on', // main contacts "on" position
      props: {
        acbBmsEnabled: true,
        acbBmsUvrEnergized: false,    // ← UVR not energized = interlock
        acbBmsSpringCharged: true,
      },
    });
    const motor = makeComponent('three_phase_motor', {
      props: { ratedLineAmps: 10 },
    });
    const jN = makeComponent('junction');

    const circuit = makeCircuit(
      [src, acb, motor, jN],
      [
        wire(src, 'L1_OUT', acb, '1'),
        wire(src, 'L2_OUT', acb, '3'),
        wire(src, 'L3_OUT', acb, '5'),
        wire(acb, '2', motor, 'L1'),
        wire(acb, '4', motor, 'L2'),
        wire(acb, '6', motor, 'L3'),
        wire(motor, 'N', jN, 'T1'),
        wire(jN, 'T1', src, 'N_OUT'),
      ]
    );

    const result = engine.simulate(circuit);

    // Motor should NOT be energized because ACB's UVR interlock prevents contact closure
    const motorNode = result.nodes[motor.id];
    expect(motorNode.energized).toBe(false);
    expect(motorNode.currentA).toBe(0);
  });

  it('ACB with BMS enabled + UVR energized allows current', () => {
    const src = makeComponent('three_phase_source');
    const acb = makeComponent('air_circuit_breaker', {
      state: 'on',
      props: {
        acbBmsEnabled: true,
        acbBmsUvrEnergized: true,     // ← UVR energized = OK
        acbBmsSpringCharged: true,
      },
    });
    const motor = makeComponent('three_phase_motor', {
      props: { ratedLineAmps: 10 },
    });
    const jN = makeComponent('junction');

    const circuit = makeCircuit(
      [src, acb, motor, jN],
      [
        wire(src, 'L1_OUT', acb, '1'),
        wire(src, 'L2_OUT', acb, '3'),
        wire(src, 'L3_OUT', acb, '5'),
        wire(acb, '2', motor, 'L1'),
        wire(acb, '4', motor, 'L2'),
        wire(acb, '6', motor, 'L3'),
        wire(motor, 'N', jN, 'T1'),
        wire(jN, 'T1', src, 'N_OUT'),
      ]
    );

    const result = engine.simulate(circuit);

    expect(result.nodes[motor.id].energized).toBe(true);
    expect(result.nodes[motor.id].currentA).toBeGreaterThan(0);
  });
});

/* ================================================================== */
/*  7. MOTORIZED MCCB — CONTROL VOLTAGE INTERLOCK                      */
/* ================================================================== */

describe('Motorized MCCB blocked by missing control voltage', () => {
  it('mMCCB with BMS enabled + ctrl voltage missing stays open', () => {
    const src = makeComponent('three_phase_source');
    const mccb = makeComponent('motorized_mccb', {
      state: 'on',
      props: {
        mccbBmsEnabled: true,
        mccbBmsCtrlVoltageOk: false,   // ← control voltage missing = interlock
        mccbBmsMotorReady: true,
      },
    });
    const motor = makeComponent('three_phase_motor', {
      props: { ratedLineAmps: 10 },
    });
    const jN = makeComponent('junction');

    const circuit = makeCircuit(
      [src, mccb, motor, jN],
      [
        wire(src, 'L1_OUT', mccb, '1'),
        wire(src, 'L2_OUT', mccb, '3'),
        wire(src, 'L3_OUT', mccb, '5'),
        wire(mccb, '2', motor, 'L1'),
        wire(mccb, '4', motor, 'L2'),
        wire(mccb, '6', motor, 'L3'),
        wire(motor, 'N', jN, 'T1'),
        wire(jN, 'T1', src, 'N_OUT'),
      ]
    );

    const result = engine.simulate(circuit);

    // Motor should NOT be energized because MCCB control voltage missing
    expect(result.nodes[motor.id].energized).toBe(false);
  });

  it('mMCCB with BMS enabled + ctrl voltage OK allows current', () => {
    const src = makeComponent('three_phase_source');
    const mccb = makeComponent('motorized_mccb', {
      state: 'on',
      props: {
        mccbBmsEnabled: true,
        mccbBmsCtrlVoltageOk: true,    // ← control voltage OK
        mccbBmsMotorReady: true,
      },
    });
    const motor = makeComponent('three_phase_motor', {
      props: { ratedLineAmps: 10 },
    });
    const jN = makeComponent('junction');

    const circuit = makeCircuit(
      [src, mccb, motor, jN],
      [
        wire(src, 'L1_OUT', mccb, '1'),
        wire(src, 'L2_OUT', mccb, '3'),
        wire(src, 'L3_OUT', mccb, '5'),
        wire(mccb, '2', motor, 'L1'),
        wire(mccb, '4', motor, 'L2'),
        wire(mccb, '6', motor, 'L3'),
        wire(motor, 'N', jN, 'T1'),
        wire(jN, 'T1', src, 'N_OUT'),
      ]
    );

    const result = engine.simulate(circuit);

    expect(result.nodes[motor.id].energized).toBe(true);
    expect(result.nodes[motor.id].currentA).toBeGreaterThan(0);
  });
});

/* ================================================================== */
/*  8. EDGE CASES                                                      */
/* ================================================================== */

describe('Edge cases', () => {
  it('empty circuit simulates without crashing', () => {
    const circuit = makeCircuit([], []);
    const result = engine.simulate(circuit);
    expect(result.success).toBe(true);
    expect(result.totalPowerW).toBe(0);
    expect(result.faults).toHaveLength(0);
  });

  it('source only (no load) simulates cleanly', () => {
    const src = makeComponent('power_source');
    const circuit = makeCircuit([src], []);
    const result = engine.simulate(circuit);

    expect(result.success).toBe(true);
    expect(result.nodes[src.id]).toBeDefined();
    expect(result.nodes[src.id].energized).toBe(true);
    expect(result.totalPowerW).toBe(0);
  });

  it('tripped MCB stays tripped across repeated simulations', () => {
    const src = makeComponent('power_source');
    const mcb = makeComponent('mcb', { state: 'tripped' });
    const lamp = makeComponent('lamp');
    const j1 = makeComponent('junction');
    const j2 = makeComponent('junction');

    const circuit = makeCircuit(
      [src, mcb, lamp, j1, j2],
      [
        wire(src, 'L_OUT', j1, 'T1'),
        wire(j1, 'T1', mcb, '1'),
        wire(mcb, '2', lamp, 'T1'),
        wire(lamp, 'T2', j2, 'T1'),
        wire(j2, 'T1', src, 'N_OUT'),
      ]
    );

    // Run twice
    engine.simulate(circuit);
    const result = engine.simulate(circuit);

    expect(mcb.state).toBe('tripped');
    expect(result.nodes[lamp.id].energized).toBe(false);
  });
});
