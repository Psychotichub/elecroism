import { describe, expect, it } from 'vitest';
import {
  computeMotorThermalTimeline,
  overloadRelayTripTimeS,
  findMotorThermalProtector,
} from '../motorThermal';
import { applyMotorInrushOverlay } from '../transientTimeline';
import { CircuitEngine } from '../engine';
import { makeCircuit, makeComponent, wire } from './testHelpers';

describe('findMotorThermalProtector', () => {
  it('prefers upstream overload relay over MCB', () => {
    const src = makeComponent('power_source', { label: 'SRC', state: 'on' });
    const mcb = makeComponent('mcb', { label: 'Q1', state: 'on' });
    const ol = makeComponent('overload_relay', {
      label: 'F1',
      state: 'on',
    });
    const motor = makeComponent('motor', { label: 'M1', state: 'on' });
    const circuit = makeCircuit(
      [src, mcb, ol, motor],
      [
        wire(src, 'L_OUT', mcb, '1'),
        wire(mcb, '2', ol, '1'),
        wire(ol, '2', motor, 'T1'),
        wire(src, 'N_OUT', motor, 'T2'),
      ]
    );
    expect(findMotorThermalProtector(circuit, motor.id)?.label).toBe('F1');
  });
});

describe('overloadRelayTripTimeS', () => {
  it('allows class-10 start at 6× without instant trip time', () => {
    expect(overloadRelayTripTimeS(6, 10)).toBeGreaterThan(10);
  });

  it('trips faster at 2× than at 1.2×', () => {
    expect(overloadRelayTripTimeS(2, 10)).toBeLessThan(
      overloadRelayTripTimeS(1.2, 10)
    );
  });
});

describe('computeMotorThermalTimeline', () => {
  it('rises during inrush then cools toward steady run', () => {
    const src = makeComponent('power_source', { label: 'SRC', state: 'on' });
    const mcb = makeComponent('mcb', { label: 'Q1', state: 'on' });
    const motor = makeComponent('motor', {
      label: 'M1',
      state: 'on',
      props: { powerWatts: 2000, ratedLineAmps: 10 },
    });
    const circuit = makeCircuit(
      [src, mcb, motor],
      [
        wire(src, 'L_OUT', mcb, '1'),
        wire(mcb, '2', motor, 'T1'),
        wire(src, 'N_OUT', motor, 'T2'),
      ]
    );

    expect(findMotorThermalProtector(circuit, motor.id)?.label).toBe('Q1');

    const engine = new CircuitEngine();
    const steady = engine.simulate(structuredClone(circuit));
    const flc = steady.nodes[motor.id]?.currentA ?? 0;
    expect(flc).toBeGreaterThan(0);

    const base = [0, 500, 2000, 5000].map((timeMs) => ({
      timeMs,
      nodes: {
        [motor.id]: {
          voltageV: 230,
          currentA: flc,
          powerW: flc * 230,
          energized: true,
        },
      },
    }));
    const withInrush = applyMotorInrushOverlay(base, circuit);
    const thermal = computeMotorThermalTimeline(withInrush, circuit);

    expect(thermal[1].motorThermal?.[motor.id].thermalPct).toBeGreaterThan(
      thermal[3].motorThermal?.[motor.id].thermalPct ?? 0
    );
    expect(thermal[0].motorThermal?.[motor.id].currentRatio).toBeGreaterThan(3);
    expect(thermal[3].motorThermal?.[motor.id].tripped).toBe(false);
  });

  it('trips on sustained overload above protector pickup', () => {
    const src = makeComponent('power_source', { label: 'SRC', state: 'on' });
    const ol = makeComponent('overload_relay', {
      label: 'F1',
      state: 'on',
      props: { ratingAmps: 5, overloadTripClass: '10' },
    });
    const motor = makeComponent('motor', {
      label: 'M1',
      state: 'on',
      props: { ratedLineAmps: 5 },
    });
    const circuit = makeCircuit(
      [src, ol, motor],
      [
        wire(src, 'L_OUT', ol, '1'),
        wire(ol, '2', motor, 'T1'),
        wire(src, 'N_OUT', motor, 'T2'),
      ]
    );

    const overloadA = 15;
    const samples = Array.from({ length: 50 }, (_, i) => ({
      timeMs: i * 500,
      nodes: {
        [motor.id]: {
          voltageV: 230,
          currentA: overloadA,
          powerW: overloadA * 230,
          energized: true,
        },
      },
    }));

    const thermal = computeMotorThermalTimeline(samples, circuit);
    const last = thermal[thermal.length - 1].motorThermal?.[motor.id];
    expect(last?.thermalPct).toBeGreaterThan(50);
    expect(last?.tripped).toBe(true);
  });
});
