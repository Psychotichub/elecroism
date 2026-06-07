import { describe, expect, it } from 'vitest';
import {
  applyFaultClearingOverlay,
  applyMotorInrushOverlay,
  applyVoltageDipOverlay,
  buildSimulationTimeline,
} from '../transientTimeline';
import { CircuitEngine } from '../engine';
import { makeCircuit, makeComponent, wire } from './testHelpers';
import { getProtectionFaultMetrics } from '../../utils/arcFlashAnalysis';

describe('buildSimulationTimeline', () => {
  it('produces samples over the requested duration', () => {
    const src = makeComponent('power_source', { label: 'SRC', state: 'on' });
    const circuit = makeCircuit([src], []);
    const samples = buildSimulationTimeline(circuit, {
      durationMs: 200,
      stepMs: 100,
    });
    expect(samples.length).toBe(3);
    expect(samples[0].timeMs).toBe(0);
    expect(samples[2].timeMs).toBe(200);
  });
});

describe('applyMotorInrushOverlay', () => {
  it('scales motor current higher at t=0 than at steady state', () => {
    const src = makeComponent('power_source', { label: 'SRC', state: 'on' });
    const mcb = makeComponent('mcb', { label: 'Q1', state: 'on' });
    const motor = makeComponent('motor', { label: 'M1', state: 'on' });
    const circuit = makeCircuit(
      [src, mcb, motor],
      [
        wire(src, 'L_OUT', mcb, '1'),
        wire(mcb, '2', motor, 'T1'),
        wire(src, 'N_OUT', motor, 'T2'),
      ]
    );
    const engine = new CircuitEngine();
    const steady = engine.simulate(structuredClone(circuit));
    const flc = steady.nodes[motor.id]?.currentA ?? 0;
    expect(flc).toBeGreaterThan(0);

    const base = [
      {
        timeMs: 0,
        nodes: {
          [motor.id]: {
            voltageV: 230,
            currentA: flc,
            powerW: flc * 230,
            energized: true,
          },
        },
      },
      {
        timeMs: 3000,
        nodes: {
          [motor.id]: {
            voltageV: 230,
            currentA: flc,
            powerW: flc * 230,
            energized: true,
          },
        },
      },
    ];
    const overlaid = applyMotorInrushOverlay(base, circuit);
    expect(overlaid[0].nodes[motor.id].currentA).toBeGreaterThan(flc * 3);
    expect(overlaid[1].nodes[motor.id].currentA).toBeCloseTo(flc, 0);
  });
});

describe('applyVoltageDipOverlay', () => {
  it('reduces motor voltage during inrush more than at steady state', () => {
    const src = makeComponent('power_source', { label: 'SRC', state: 'on' });
    const mcb = makeComponent('mcb', { label: 'Q1', state: 'on' });
    const motor = makeComponent('motor', { label: 'M1', state: 'on' });
    const circuit = makeCircuit(
      [src, mcb, motor],
      [
        wire(src, 'L_OUT', mcb, '1'),
        wire(mcb, '2', motor, 'T1'),
        wire(src, 'N_OUT', motor, 'T2'),
      ]
    );
    const engine = new CircuitEngine();
    const steady = engine.simulate(structuredClone(circuit));
    const flc = steady.nodes[motor.id]?.currentA ?? 0;
    expect(flc).toBeGreaterThan(0);

    const withInrush = applyMotorInrushOverlay(
      [
        {
          timeMs: 0,
          nodes: {
            [src.id]: { voltageV: 230, currentA: 0, powerW: 0, energized: true },
            [motor.id]: {
              voltageV: 230,
              currentA: flc,
              powerW: flc * 230,
              energized: true,
            },
          },
        },
        {
          timeMs: 3000,
          nodes: {
            [src.id]: { voltageV: 230, currentA: 0, powerW: 0, energized: true },
            [motor.id]: {
              voltageV: 230,
              currentA: flc,
              powerW: flc * 230,
              energized: true,
            },
          },
        },
      ],
      circuit
    );
    const dipped = applyVoltageDipOverlay(withInrush, circuit);
    expect(dipped[0].nodes[motor.id].voltageV).toBeLessThan(230);
    expect(dipped[1].nodes[motor.id].voltageV).toBeCloseTo(230, 0);
  });
});

describe('fault clearing timeline', () => {
  it('shows high fault current then clears after trip time', () => {
    const src = makeComponent('power_source', { label: 'SRC', state: 'on' });
    const mcb = makeComponent('mcb', {
      label: 'Q1',
      state: 'on',
      props: { ratingAmps: 16, tripCurve: 'C', breakingCapacity: 10000 },
    });
    const motor = makeComponent('motor', { label: 'M1', state: 'on' });
    const circuit = makeCircuit(
      [src, mcb, motor],
      [
        wire(src, 'L_OUT', mcb, '1'),
        wire(mcb, '2', motor, 'T1'),
        wire(src, 'N_OUT', motor, 'T2'),
      ]
    );
    const engine = new CircuitEngine();
    const steady = engine.simulate(structuredClone(circuit));
    const metrics = getProtectionFaultMetrics(circuit, mcb.id, steady);
    expect(metrics).not.toBeNull();
    expect(metrics!.boltedFaultA).toBeGreaterThan(100);

    const clearMs = metrics!.clearingTimeS * 1000;
    const base = [
      { timeMs: 0, nodes: { [mcb.id]: { voltageV: 230, currentA: 0, powerW: 0, energized: true } } },
      {
        timeMs: clearMs - 1,
        nodes: { [mcb.id]: { voltageV: 230, currentA: 0, powerW: 0, energized: true } },
      },
      {
        timeMs: clearMs + 5,
        nodes: { [mcb.id]: { voltageV: 230, currentA: 0, powerW: 0, energized: true } },
      },
    ];
    const cleared = applyFaultClearingOverlay(base, circuit, mcb.id, metrics!);
    expect(cleared[0].nodes[mcb.id].currentA).toBeGreaterThan(500);
    expect(cleared[1].nodes[mcb.id].currentA).toBeGreaterThan(500);
    expect(cleared[2].nodes[mcb.id].currentA).toBe(0);
    expect(cleared[2].nodes[mcb.id].energized).toBe(false);
  });

  it('builds ms-resolution samples for fault clearing scenario', () => {
    const src = makeComponent('power_source', { label: 'SRC', state: 'on' });
    const mcb = makeComponent('mcb', {
      label: 'Q1',
      state: 'on',
      props: { ratingAmps: 16, tripCurve: 'C', breakingCapacity: 10000 },
    });
    const motor = makeComponent('motor', { label: 'M1', state: 'on' });
    const circuit = makeCircuit(
      [src, mcb, motor],
      [
        wire(src, 'L_OUT', mcb, '1'),
        wire(mcb, '2', motor, 'T1'),
        wire(src, 'N_OUT', motor, 'T2'),
      ]
    );
    const samples = buildSimulationTimeline(circuit, {
      scenario: 'fault_clearing',
      faultDeviceId: mcb.id,
    });
    expect(samples.length).toBeGreaterThan(50);
    expect(samples[1].timeMs - samples[0].timeMs).toBe(1);
    const early = samples[5];
    const end = samples[samples.length - 1];
    expect(early.nodes[mcb.id].currentA).toBeGreaterThan(100);
    expect(end.nodes[mcb.id].currentA).toBe(0);
    expect(end.nodes[mcb.id].energized).toBe(false);
  });
});
