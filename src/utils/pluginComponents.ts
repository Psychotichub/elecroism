import { v4 as uuid } from 'uuid';
import type { CircuitComponent, ComponentProperties } from '../types';
import type { PluginComponentTypeDef, PluginManifest } from '../types/plugin';
import { findPluginType } from './pluginRegistry';

export function buildPluginComponent(
  plugins: PluginManifest[],
  pluginId: string,
  typeId: string,
  x: number,
  y: number
): CircuitComponent | null {
  const typeDef = findPluginType(plugins, pluginId, typeId);
  if (!typeDef) return null;
  const id = uuid();
  const properties: ComponentProperties = {
    phaseSystem: 'single_phase',
    pluginId,
    pluginTypeId: typeId,
    pluginSimModel: typeDef.simulation.model,
    pluginSimLiveTerminal: typeDef.simulation.liveTerminal,
    pluginSimNeutralTerminal: typeDef.simulation.neutralTerminal,
    pluginSimPowerProperty: typeDef.simulation.powerProperty,
    pluginSimConductingStates: (typeDef.simulation.conductingStates ?? ['on']).join(
      ','
    ),
    ...(typeDef.defaultProperties as ComponentProperties),
  };
  const defaultState = typeDef.simulation.defaultState ?? 'on';
  return {
    id,
    type: 'plugin_component',
    label: typeDef.label,
    x,
    y,
    scale: 1,
    rotation: 0,
    state: defaultState,
    selected: false,
    connectionPoints: typeDef.terminals.map((t) => ({
      id: `${id}-${t.id}`,
      componentId: id,
      label: t.label,
      x: t.x,
      y: t.y,
    })),
    properties,
    drawingLayer:
      typeDef.category === 'Power'
        ? 'power'
        : typeDef.category === 'Control'
          ? 'control'
          : typeDef.category === 'Instrumentation'
            ? 'instrumentation'
            : 'power',
  };
}

export function resolvePluginTypeForComponent(
  plugins: PluginManifest[],
  component: CircuitComponent
): PluginComponentTypeDef | null {
  if (component.type !== 'plugin_component') return null;
  const pluginId = component.properties.pluginId;
  const typeId = component.properties.pluginTypeId;
  if (!pluginId || !typeId) return null;
  return findPluginType(plugins, pluginId, typeId);
}
