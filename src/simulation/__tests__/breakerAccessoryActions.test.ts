import { describe, expect, it } from 'vitest';
import { engine } from '../engine';
import { makeComponent, makeCircuit, wire } from './testHelpers';

describe('Breaker Accessory Actions', () => {
  it('Shunt trip coil energized -> parent breaker trips', () => {
    // 1. Create power source, shunt trip coil, and parent breaker
    const src = makeComponent('power_source', { state: 'on' });
    const breaker = makeComponent('mccb', { state: 'on' });
    const shunt = makeComponent('shunt_trip_coil', {
      props: { breakerParentId: breaker.id, voltage: 230 },
    });

    // 2. Wire the shunt trip coil across L and N to energize it
    const wires = [
      wire(src, 'L_OUT', shunt, 'A1'),
      wire(src, 'N_OUT', shunt, 'A2'),
    ];

    const circuit = makeCircuit([src, breaker, shunt], wires);
    
    // 3. Simulate and assert breaker is tripped
    const result = engine.simulate(circuit);
    expect(breaker.state).toBe('tripped');
    expect(result.faults.some(f => f.type === 'trip' && f.affectedComponentId === breaker.id)).toBe(true);
  });

  it('Closing coil energized -> tripped breaker resets to on', () => {
    // 1. Create power source, closing coil, and parent breaker (starts tripped)
    const src = makeComponent('power_source', { state: 'on' });
    const breaker = makeComponent('mccb', { state: 'tripped' });
    const closingCoil = makeComponent('closing_coil', {
      props: { breakerParentId: breaker.id, voltage: 230 },
    });

    // 2. Wire the closing coil across L and N to energize it
    const wires = [
      wire(src, 'L_OUT', closingCoil, 'A1'),
      wire(src, 'N_OUT', closingCoil, 'A2'),
    ];

    const circuit = makeCircuit([src, breaker, closingCoil], wires);
    
    // 3. Simulate and assert breaker is on
    engine.simulate(circuit);
    expect(breaker.state).toBe('on');
  });

  it('UVR de-energized -> closed breaker drops open', () => {
    // 1. Create parent breaker (starts on), and UVR (unwired/de-energized)
    const breaker = makeComponent('mccb', { state: 'on' });
    const uvr = makeComponent('uvr_release', {
      props: { breakerParentId: breaker.id, voltage: 230 },
    });

    const circuit = makeCircuit([breaker, uvr], []);
    
    // 2. Simulate and assert breaker drops off
    const result = engine.simulate(circuit);
    expect(breaker.state).toBe('off');
    expect(result.faults.some(f => f.type === 'trip' && f.affectedComponentId === breaker.id)).toBe(true);
  });

  it('UVR energized -> closed breaker stays on', () => {
    // 1. Create power source, breaker (starts on), and UVR (wired/energized)
    const src = makeComponent('power_source', { state: 'on' });
    const breaker = makeComponent('mccb', { state: 'on' });
    const uvr = makeComponent('uvr_release', {
      props: { breakerParentId: breaker.id, voltage: 230 },
    });

    const wires = [
      wire(src, 'L_OUT', uvr, 'A1'),
      wire(src, 'N_OUT', uvr, 'A2'),
    ];

    const circuit = makeCircuit([src, breaker, uvr], wires);
    
    // 2. Simulate and assert breaker stays on
    const result = engine.simulate(circuit);
    expect(breaker.state).toBe('on');
    expect(result.faults.some(f => f.affectedComponentId === breaker.id)).toBe(false);
  });

  it('Motor operator with close command -> closes parent breaker', () => {
    // 1. Create power source, motorized breaker parent (starts off), and motor operator kit
    const src = makeComponent('power_source', { state: 'on' });
    const breaker = makeComponent('mccb', { state: 'off' });
    const motor = makeComponent('motor_operator_kit', {
      props: {
        breakerParentId: breaker.id,
        voltage: 230,
        motorOperatorCommand: 'close',
      },
    });

    // 2. Wire control supply (CTRL_L to L, CTRL_N to N)
    const wires = [
      wire(src, 'L_OUT', motor, 'CTRL_L'),
      wire(src, 'N_OUT', motor, 'CTRL_N'),
    ];

    const circuit = makeCircuit([src, breaker, motor], wires);
    
    // 3. Simulate and assert breaker closes to on
    engine.simulate(circuit);
    expect(breaker.state).toBe('on');
  });

  it('Motor operator with open command -> opens parent breaker', () => {
    // 1. Create power source, motorized breaker parent (starts on), and motor operator kit
    const src = makeComponent('power_source', { state: 'on' });
    const breaker = makeComponent('mccb', { state: 'on' });
    const motor = makeComponent('motor_operator_kit', {
      props: {
        breakerParentId: breaker.id,
        voltage: 230,
        motorOperatorCommand: 'open',
      },
    });

    // 2. Wire control supply (CTRL_L to L, CTRL_N to N)
    const wires = [
      wire(src, 'L_OUT', motor, 'CTRL_L'),
      wire(src, 'N_OUT', motor, 'CTRL_N'),
    ];

    const circuit = makeCircuit([src, breaker, motor], wires);
    
    // 3. Simulate and assert breaker opens to off
    engine.simulate(circuit);
    expect(breaker.state).toBe('off');
  });

  it('Accessory with missing or invalid parent breaker does not crash', () => {
    const src = makeComponent('power_source', { state: 'on' });
    const shunt = makeComponent('shunt_trip_coil', {
      props: { breakerParentId: 'non-existent-id', voltage: 230 },
    });

    const wires = [
      wire(src, 'L_OUT', shunt, 'A1'),
      wire(src, 'N_OUT', shunt, 'A2'),
    ];

    const circuit = makeCircuit([src, shunt], wires);
    
    expect(() => engine.simulate(circuit)).not.toThrow();
  });
});
