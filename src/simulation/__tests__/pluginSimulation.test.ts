import { describe, expect, it } from 'vitest';
import { EXAMPLE_PLUGIN_MANIFEST } from '../../plugins/bundledExamplePlugin';
import { buildPluginComponent } from '../../utils/pluginComponents';
import { makeCircuit, makeComponent, wire } from './testHelpers';
import { CircuitEngine } from '../engine';
import {
  applyPluginInternalBridges,
  calculatePluginCurrent,
  pluginConducting,
  pluginIsLoadConfig,
  pluginSimConfigFromComponent,
} from '../pluginSimulation';
import { terminalKey } from '../engineTypes';

describe('pluginSimulation', () => {
  const plugins = [EXAMPLE_PLUGIN_MANIFEST];

  it('classifies resistive_load config as a load', () => {
    const beacon = buildPluginComponent(plugins, plugins[0].id, 'warning_beacon', 0, 0)!;
    const cfg = pluginSimConfigFromComponent(beacon);
    expect(cfg).not.toBeNull();
    expect(pluginIsLoadConfig(cfg!)).toBe(true);
    expect(calculatePluginCurrent(beacon, cfg!, 230)).toBeCloseTo(25 / 230, 4);
  });

  it('bridges pass_through terminals only in conducting states', () => {
    const sw = buildPluginComponent(plugins, plugins[0].id, 'aux_switch', 0, 0)!;
    const cfg = pluginSimConfigFromComponent(sw)!;
    const graph = new Map<string, Set<string>>();
    sw.state = 'on';
    applyPluginInternalBridges(graph, sw, cfg);
    const keys = sw.connectionPoints.map((cp) => terminalKey(sw.id, cp.id));
    expect(graph.get(keys[0])?.has(keys[1])).toBe(true);
    graph.clear();
    sw.state = 'off';
    applyPluginInternalBridges(graph, sw, cfg);
    expect(graph.size).toBe(0);
    expect(pluginConducting(sw, cfg)).toBe(false);
  });

  it('simulates a plugin resistive load on a simple L/N circuit', () => {
    const source = makeComponent('power_source', {
      label: 'Supply',
      x: 0,
      y: 0,
      state: 'on',
    });
    const beacon = buildPluginComponent(
      plugins,
      plugins[0].id,
      'warning_beacon',
      120,
      0
    )!;
    const wires = [
      wire(source, 'L_OUT', beacon, 'L'),
      wire(source, 'N_OUT', beacon, 'N'),
    ];
    const circuit = makeCircuit([source, beacon], wires);
    const engine = new CircuitEngine();
    const result = engine.simulate(circuit);
    const node = result.nodes[beacon.id];
    expect(node?.energized).toBe(true);
    expect(node?.currentA).toBeGreaterThan(0);
  });
});
