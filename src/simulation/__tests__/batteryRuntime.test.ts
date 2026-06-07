import { describe, expect, it } from 'vitest';
import { CircuitEngine } from '../engine';
import {
  batteryCanSupply,
  effectiveBatteryVoltage,
  readBatteryRemainingAh,
  writeBatteryRemainingAh,
} from '../batteryRuntime';
import { makeCircuit, makeComponent, wire } from './testHelpers';

function upsBackupCircuit(mainsOn: boolean) {
  const mains = makeComponent('power_source', {
    label: 'AC Mains',
    state: mainsOn ? 'on' : 'off',
  });
  const ups = makeComponent('ups_module', {
    label: 'UPS-1',
    state: 'on',
    props: { upsInverterEnabled: true, upsChargeCurrentA: 2 },
  });
  const battery = makeComponent('dc_battery_backup', {
    label: 'BAT',
    state: 'on',
    props: {
      voltage: 24,
      batteryCapacityAh: 10,
      batteryRemainingAh: 10,
      batteryCutoffPercent: 15,
    },
  });
  const load = makeComponent('lamp', {
    label: 'Critical Load',
    props: { powerWatts: 60 },
  });
  const wires = [
    wire(mains, 'L_OUT', ups, 'AC_IN_L'),
    wire(mains, 'N_OUT', ups, 'AC_IN_N'),
    wire(ups, 'AC_OUT_L', load, 'T1'),
    wire(ups, 'AC_OUT_N', load, 'T2', 'blue'),
    wire(battery, 'BAT_POS', ups, 'BAT_POS', 'red'),
    wire(battery, 'BAT_NEG', ups, 'BAT_NEG', 'black'),
  ];
  return { circuit: makeCircuit([mains, ups, battery, load], wires), ups, battery, load, mains };
}

describe('batteryRuntime math', () => {
  it('sags voltage as state of charge falls', () => {
    const bat = makeComponent('dc_battery_backup', {
      props: {
        voltage: 24,
        batteryCapacityAh: 10,
        batteryRemainingAh: 10,
        batteryCutoffPercent: 15,
      },
    });
    expect(effectiveBatteryVoltage(bat)).toBeCloseTo(24, 0);
    writeBatteryRemainingAh(bat, 1.4);
    expect(effectiveBatteryVoltage(bat)).toBe(0);
    expect(batteryCanSupply(bat)).toBe(false);
  });
});

describe('batteryRuntime integration', () => {
  const engine = new CircuitEngine();
  const oneHour = 3_600_000;

  it('depletes battery on inverter backup', () => {
    const { circuit, battery } = upsBackupCircuit(false);
    engine.simulate(circuit, 0, 1_000_000, { simStepMs: oneHour });
    const remaining = readBatteryRemainingAh(battery);
    expect(remaining).toBeLessThan(10);
    expect(remaining).toBeCloseTo(7.5, 0);
  });

  it('trips UPS when battery is depleted', () => {
    const { circuit, ups, battery } = upsBackupCircuit(false);
    writeBatteryRemainingAh(battery, 2);
    engine.simulate(circuit, 0, 2_000_000, { simStepMs: oneHour });
    expect(ups.state).toBe('tripped');
    expect(batteryCanSupply(battery)).toBe(false);
  });

  it('charges battery when mains is restored', () => {
    const { circuit, battery } = upsBackupCircuit(true);
    writeBatteryRemainingAh(battery, 5);
    const result = engine.simulate(circuit, 0, 3_000_000, { simStepMs: oneHour });
    expect(readBatteryRemainingAh(battery)).toBeCloseTo(7, 0);
    const upsNode = result.nodes[circuit.components.find((c) => c.type === 'ups_module')!.id];
    expect(upsNode?.upsBatteryChargeCurrentA).toBe(2);
    expect(upsNode?.currentA ?? 0).toBeGreaterThan(0);
  });

  it('includes UPS charge current on upstream AC series path', () => {
    const { circuit, mains, ups, battery, load } = upsBackupCircuit(true);
    const mcb = makeComponent('mcb', { state: 'on', props: { ratingAmps: 16 } });
    writeBatteryRemainingAh(battery, 4);
    circuit.components.push(mcb);
    circuit.wires = [
      wire(mains, 'L_OUT', mcb, '1'),
      wire(mcb, '2', ups, 'AC_IN_L'),
      wire(mains, 'N_OUT', ups, 'AC_IN_N'),
      wire(ups, 'AC_OUT_L', load, 'T1'),
      wire(ups, 'AC_OUT_N', load, 'T2', 'blue'),
      wire(battery, 'BAT_POS', ups, 'BAT_POS', 'red'),
      wire(battery, 'BAT_NEG', ups, 'BAT_NEG', 'black'),
    ];
    const result = engine.simulate(circuit, 0, 4_000_000, { simStepMs: oneHour });
    expect(result.nodes[mcb.id]?.currentA ?? 0).toBeGreaterThan(0.05);
  });
});
