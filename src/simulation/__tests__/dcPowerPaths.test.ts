import { describe, expect, it } from 'vitest';
import { engine } from '../engine';
import { propagatePotentials } from '../potentials';
import { buildTerminalGraph } from '../terminalGraph';
import { collectDcSourceSeeds } from '../dcPowerPaths';
import { terminalKey } from '../engineTypes';
import { makeComponent, makeCircuit, wire } from './testHelpers';
import { dcUpsBackup } from '../../examples/exampleCircuits';

describe('dcPowerPaths', () => {
  it('seeds DC potentials from battery string', () => {
    const bat = makeComponent('dc_battery_backup', {
      state: 'on',
      props: { voltage: 24 },
    });
    const circuit = makeCircuit([bat], []);
    const seeds = collectDcSourceSeeds(circuit);
    expect(seeds.plus.length).toBe(1);
    expect(seeds.minus.length).toBe(1);
  });

  it('UPS inverter feeds AC load from battery when mains is off', () => {
    const circuit = dcUpsBackup();
    const result = engine.simulate(circuit);
    const load = circuit.components.find((c) => c.label === 'Critical Load');
    expect(load).toBeTruthy();
    expect(result.nodes[load!.id]?.energized).toBe(true);
    expect(result.nodes[load!.id]?.powerW).toBeGreaterThan(0);
  });

  it('charger propagates DC when AC input is energized', () => {
    const src = makeComponent('power_source', { state: 'on' });
    const smps = makeComponent('smps', { state: 'on', props: { voltage: 24 } });
    const load = makeComponent('lamp', { props: { powerWatts: 10 } });
    const wires = [
      wire(src, 'L_OUT', smps, 'AC_L'),
      wire(src, 'N_OUT', smps, 'AC_N'),
      wire(smps, 'DC_PLUS', load, 'T1', { color: 'red' }),
      wire(smps, 'DC_MINUS', load, 'T2', { color: 'black' }),
    ];
    const circuit = makeCircuit([src, smps, load], wires);
    const graph = buildTerminalGraph(circuit);
    const potentials = propagatePotentials(circuit, graph);
    const lampL = load.connectionPoints.find((p) => p.label === 'T1')!;
    const lampN = load.connectionPoints.find((p) => p.label === 'T2')!;
    const lKey = `${load.id}:${lampL.id}`;
    const nKey = `${load.id}:${lampN.id}`;
    expect(potentials.live.has(lKey)).toBe(true);
    expect(potentials.neutral.has(nKey)).toBe(true);
  });

  it('propagates UPS AC output from battery when mains is absent', () => {
    const ups = makeComponent('ups_module', {
      state: 'on',
      props: { upsInverterEnabled: true },
    });
    const bat = makeComponent('dc_battery_backup', { state: 'on' });
    const load = makeComponent('lamp', { props: { powerWatts: 20 } });
    const wires = [
      wire(bat, 'BAT_POS', ups, 'BAT_POS', { color: 'red' }),
      wire(bat, 'BAT_NEG', ups, 'BAT_NEG', { color: 'black' }),
      wire(ups, 'AC_OUT_L', load, 'T1'),
      wire(ups, 'AC_OUT_N', load, 'T2', { color: 'blue' }),
    ];
    const circuit = makeCircuit([ups, bat, load], wires);
    const graph = buildTerminalGraph(circuit);
    const potentials = propagatePotentials(circuit, graph);
    const acOutL = ups.connectionPoints.find((p) => p.label === 'AC_OUT_L')!;
    const acOutN = ups.connectionPoints.find((p) => p.label === 'AC_OUT_N')!;
    expect(potentials.live.has(terminalKey(ups.id, acOutL.id))).toBe(true);
    expect(potentials.neutral.has(terminalKey(ups.id, acOutN.id))).toBe(true);
  });
});
