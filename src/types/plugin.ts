/** JSON plugin manifest format (`.eplugin.json`) — v1, no executable code. */

export const PLUGIN_MANIFEST_VERSION = '1.0';

export type PluginPropertyFieldType = 'number' | 'text' | 'select' | 'boolean';

export type PluginPropertyField = {
  key: string;
  label: string;
  type: PluginPropertyFieldType;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  placeholder?: string;
};

export type PluginTerminalDef = {
  id: string;
  label: string;
  x: number;
  y: number;
};

export type PluginSymbolShape = 'rect' | 'circle';

export type PluginSymbolDef = {
  shape: PluginSymbolShape;
  width: number;
  height: number;
  /** Short symbol text inside the body. */
  glyph?: string;
  fill?: string;
  stroke?: string;
};

export type PluginSimulationModel =
  | 'pass_through'
  | 'resistive_load'
  | 'open';

export type PluginSimulationDef = {
  model: PluginSimulationModel;
  /** Component states that close internal contacts (pass_through). */
  conductingStates?: Array<'on' | 'off' | 'tripped' | 'fault'>;
  defaultState?: 'on' | 'off';
  /** Live/neutral terminal labels for resistive_load (defaults T1/T2). */
  liveTerminal?: string;
  neutralTerminal?: string;
  /** Property key used for power watts when model is resistive_load. */
  powerProperty?: string;
};

export type PluginComponentTypeDef = {
  id: string;
  label: string;
  category: 'Power' | 'Control' | 'Instrumentation' | 'Auxiliary';
  description?: string;
  symbol: PluginSymbolDef;
  terminals: PluginTerminalDef[];
  defaultProperties?: Record<string, string | number | boolean>;
  propertyFields?: PluginPropertyField[];
  simulation: PluginSimulationDef;
  /** Allow clicking the symbol to toggle on/off (pass_through). */
  toggleable?: boolean;
};

export type PluginManifest = {
  version: string;
  id: string;
  name: string;
  author?: string;
  description?: string;
  minAppVersion?: string;
  componentTypes: PluginComponentTypeDef[];
};
