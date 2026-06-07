import type { CircuitComponent, ComponentProperties } from '../types';
import type { PluginComponentTypeDef, PluginManifest } from '../types/plugin';
import { findPluginType } from '../utils/pluginRegistry';
import { addEdge, terminalKey } from './engineTypes';

export type PluginSimConfig = {
  model: 'pass_through' | 'resistive_load' | 'open';
  liveTerminal: string;
  neutralTerminal: string;
  powerProperty: string;
  conductingStates: Array<'on' | 'off' | 'tripped' | 'fault'>;
};

export function pluginSimConfigFromProperties(
  props: ComponentProperties
): PluginSimConfig | null {
  if (!props.pluginSimModel) return null;
  const states = (props.pluginSimConductingStates ?? 'on')
    .split(',')
    .map((s) => s.trim())
    .filter(
      (s): s is 'on' | 'off' | 'tripped' | 'fault' =>
        s === 'on' || s === 'off' || s === 'tripped' || s === 'fault'
    );
  return {
    model: props.pluginSimModel,
    liveTerminal: props.pluginSimLiveTerminal ?? 'T1',
    neutralTerminal: props.pluginSimNeutralTerminal ?? 'T2',
    powerProperty: props.pluginSimPowerProperty ?? 'powerWatts',
    conductingStates: states.length > 0 ? states : ['on'],
  };
}

export function pluginSimConfigFromComponent(
  component: CircuitComponent
): PluginSimConfig | null {
  if (component.type !== 'plugin_component') return null;
  return pluginSimConfigFromProperties(component.properties);
}

function findTerminalByLabel(
  component: CircuitComponent,
  label: string
): string | null {
  const cp = component.connectionPoints.find(
    (p) => p.label.toUpperCase() === label.toUpperCase()
  );
  return cp ? terminalKey(component.id, cp.id) : null;
}

export function resolvePluginTypeDef(
  plugins: PluginManifest[],
  component: CircuitComponent
): PluginComponentTypeDef | null {
  if (component.type !== 'plugin_component') return null;
  const pluginId = component.properties.pluginId;
  const typeId = component.properties.pluginTypeId;
  if (!pluginId || !typeId) return null;
  return findPluginType(plugins, pluginId, typeId);
}

export function pluginIsLoad(typeDef: PluginComponentTypeDef): boolean {
  return typeDef.simulation.model === 'resistive_load';
}

export function pluginIsLoadConfig(config: PluginSimConfig): boolean {
  return config.model === 'resistive_load';
}

export function pluginConducting(
  component: CircuitComponent,
  config: PluginSimConfig
): boolean {
  if (config.model !== 'pass_through') return false;
  return config.conductingStates.includes(component.state);
}

export function applyPluginInternalBridges(
  graph: Map<string, Set<string>>,
  component: CircuitComponent,
  config: PluginSimConfig
): void {
  if (config.model === 'pass_through' && pluginConducting(component, config)) {
    const keys = component.connectionPoints.map((cp) =>
      terminalKey(component.id, cp.id)
    );
    if (keys.length >= 2) {
      for (let i = 0; i < keys.length - 1; i++) {
        addEdge(graph, keys[i], keys[i + 1]);
      }
    }
  }
}

export function pluginLiveTerminal(
  component: CircuitComponent,
  config: PluginSimConfig
): string | null {
  return findTerminalByLabel(component, config.liveTerminal);
}

export function pluginNeutralTerminal(
  component: CircuitComponent,
  config: PluginSimConfig
): string | null {
  return findTerminalByLabel(component, config.neutralTerminal);
}

export function calculatePluginCurrent(
  component: CircuitComponent,
  config: PluginSimConfig,
  voltage: number
): number {
  if (config.model !== 'resistive_load') return 0;
  const key = config.powerProperty;
  const raw = component.properties[key as keyof typeof component.properties];
  const watts = typeof raw === 'number' ? raw : Number(raw) || 25;
  const v = Math.max(voltage, 1);
  const pf = component.properties.powerFactor ?? 1;
  return watts / (v * (pf > 0 ? pf : 1));
}
