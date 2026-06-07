import { describe, expect, it } from 'vitest';
import { CircuitEngine } from '../engine';
import { checkOverloadRelayFaults } from '../faultDetection';
import { makeCircuit, makeComponent, wire } from './testHelpers';

describe('checkOverloadRelayFaults', () => {
  it('does not trip instantly on first evaluation above pickup', () => {
    const ol = makeComponent('overload_relay', {
      state: 'on',
      props: { ratingAmps: 10, overloadTripClass: '10' },
    });
    const fault = checkOverloadRelayFaults(ol, 25, 1000, 0);
    expect(fault).toBeNull();
    expect(ol.overloadSimState?.thermalHeatPct ?? 0).toBe(0);
  });

  it('survives brief inrush without tripping (Class 10)', () => {
    const ol = makeComponent('overload_relay', {
      state: 'on',
      props: { ratingAmps: 10, overloadTripClass: '10' },
    });
    let wall = 0;
    for (let i = 0; i < 4; i++) {
      wall += 500;
      const fault = checkOverloadRelayFaults(ol, 60, wall, 500);
      expect(fault).toBeNull();
    }
    expect(ol.overloadSimState?.thermalHeatPct ?? 0).toBeLessThan(50);
  });

  it('trips after sustained overload integrates to threshold', () => {
    const ol = makeComponent('overload_relay', {
      state: 'on',
      props: { ratingAmps: 5, overloadTripClass: '10' },
    });
    let wall = 0;
    let fault = null;
    for (let i = 0; i < 30; i++) {
      wall += 2000;
      fault = checkOverloadRelayFaults(ol, 20, wall, 2000);
      if (fault) break;
    }
    expect(fault?.type).toBe('overload');
    expect(fault?.message).toContain('Class 10');
  });
});

describe('overload relay engine integration', () => {
  it('does not trip on steady-state motor run below pickup', () => {
    const src = makeComponent('power_source', { state: 'on' });
    const ol = makeComponent('overload_relay', {
      state: 'on',
      props: { ratingAmps: 16, overloadTripClass: '10' },
    });
    const motor = makeComponent('motor', {
      state: 'on',
      props: { powerWatts: 2000, ratedLineAmps: 10, powerFactor: 0.85 },
    });
    const circuit = makeCircuit(
      [src, ol, motor],
      [
        wire(src, 'L_OUT', ol, '1'),
        wire(ol, '2', motor, 'T1'),
        wire(src, 'N_OUT', motor, 'T2'),
      ]
    );
    const engine = new CircuitEngine();
    const result = engine.simulate(circuit);
    expect(circuit.components.find((c) => c.id === ol.id)?.state).toBe('on');
    expect(result.faults.some((f) => f.affectedComponentId === ol.id)).toBe(false);
  });

  it('trips after stepped simulation with sustained overload', () => {
    const src = makeComponent('power_source', { state: 'on' });
    const ol = makeComponent('overload_relay', {
      state: 'on',
      props: { ratingAmps: 5, overloadTripClass: '10' },
    });
    const motor = makeComponent('motor', {
      state: 'on',
      props: { powerWatts: 6000, powerFactor: 1, ratedLineAmps: 5 },
    });
    const circuit = makeCircuit(
      [src, ol, motor],
      [
        wire(src, 'L_OUT', ol, '1'),
        wire(ol, '2', motor, 'T1'),
        wire(src, 'N_OUT', motor, 'T2'),
      ]
    );
    const engine = new CircuitEngine();
    let wall = 1_000_000;
    let tripped = false;
    for (let i = 0; i < 20; i++) {
      wall += 5000;
      const result = engine.simulate(circuit, 0, wall, { simStepMs: 5000 });
      if (ol.state === 'tripped') {
        tripped = true;
        expect(result.faults.some((f) => f.type === 'overload')).toBe(true);
        break;
      }
    }
    expect(tripped).toBe(true);
  });
});
