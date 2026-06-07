import { describe, expect, it } from 'vitest';
import { CircuitEngine } from '../engine';
import {
  applyPowerQualityHarmonics,
  harmonicRmsCurrentA,
  rmsCurrentFromThd,
  thdPercentOf,
  triplenNeutralCurrentA,
} from '../powerQuality';
import { makeCircuit, makeComponent, wire } from './testHelpers';

describe('powerQuality math', () => {
  it('increases RMS current with THD', () => {
    expect(rmsCurrentFromThd(10, 80)).toBeGreaterThan(10);
    expect(harmonicRmsCurrentA(10, 80)).toBeCloseTo(8, 0);
  });

  it('triplen neutral adds for 3φ nonlinear load', () => {
    const iN = triplenNeutralCurrentA(10, 35);
    expect(iN).toBeGreaterThan(5);
  });
});

describe('applyPowerQualityHarmonics', () => {
  const engine = new CircuitEngine();

  it('raises SMPS input RMS current with default 80% THD', () => {
    const src = makeComponent('power_source', { label: 'SRC', state: 'on' });
    const smps = makeComponent('smps', {
      label: 'PSU1',
      state: 'on',
      props: { voltage: 24, powerWatts: 120, thdPercent: 80 },
    });
    const circuit = makeCircuit(
      [src, smps],
      [
        wire(src, 'L_OUT', smps, 'AC_L'),
        wire(src, 'N_OUT', smps, 'AC_N'),
      ]
    );
    const result = engine.simulate(structuredClone(circuit));
    const n = result.nodes[smps.id];
    expect(n?.energized).toBe(true);
    expect(n?.thdPercent).toBe(80);
    expect(n?.fundamentalCurrentA).toBeGreaterThan(0);
    expect(n?.currentA).toBeGreaterThan(n?.fundamentalCurrentA ?? 0);
    expect(result.powerQualityMaxThdPct).toBe(80);
  });

  it('adds triplen neutral on VFD-fed 3φ motor', () => {
    const src = makeComponent('three_phase_source', { label: 'SRC', state: 'on' });
    const mcb = makeComponent('three_phase_mcb', { label: 'Q1', state: 'on' });
    const motor = makeComponent('three_phase_motor', {
      label: 'M1',
      state: 'on',
      props: {
        powerWatts: 3000,
        motorDrive: 'vfd',
        thdPercent: 35,
        powerFactor: 0.85,
      },
    });
    const jN = makeComponent('junction', { label: 'JN' });
    const circuit = makeCircuit(
      [src, mcb, motor, jN],
      [
        wire(src, 'L1_OUT', mcb, '1'),
        wire(mcb, '2', motor, 'L1'),
        wire(src, 'L2_OUT', mcb, '3'),
        wire(mcb, '4', motor, 'L2'),
        wire(src, 'L3_OUT', mcb, '5'),
        wire(mcb, '6', motor, 'L3'),
        wire(motor, 'N', jN, 'T1'),
        wire(src, 'N_OUT', jN, 'T1'),
      ]
    );
    const result = engine.simulate(structuredClone(circuit));
    const n = result.nodes[motor.id];
    expect(thdPercentOf(motor)).toBe(35);
    expect(n?.currentNeutralA ?? 0).toBeGreaterThan(0.5);
    expect(result.powerQualityNeutralHarmonicA ?? 0).toBeGreaterThan(0.5);
  });

  it('applyPowerQualityHarmonics on empty circuit returns zero summary', () => {
    const circuit = makeCircuit([], []);
    const summary = applyPowerQualityHarmonics(circuit, {});
    expect(summary.nonlinearLoadCount).toBe(0);
  });
});
