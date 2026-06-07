import { APP_VERSION } from '../constants/appVersion';
import type {
  PluginComponentTypeDef,
  PluginManifest,
} from '../types/plugin';
import { PLUGIN_MANIFEST_VERSION } from '../types/plugin';

const FORBIDDEN_KEYS = new Set([
  'script',
  'code',
  'eval',
  'wasm',
  'function',
  'handler',
  'module',
  'require',
]);

export type PluginCompatibilityResult = {
  compatible: boolean;
  reason?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function hasForbiddenKeys(value: unknown, depth = 0): boolean {
  if (depth > 8) return true;
  if (Array.isArray(value)) {
    return value.some((v) => hasForbiddenKeys(v, depth + 1));
  }
  if (!isRecord(value)) return false;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) return true;
    if (hasForbiddenKeys(child, depth + 1)) return true;
  }
  return false;
}

function parseComponentType(raw: unknown): PluginComponentTypeDef | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string' || typeof raw.label !== 'string') return null;
  if (!isRecord(raw.symbol) || typeof raw.symbol.shape !== 'string') return null;
  if (!Array.isArray(raw.terminals) || raw.terminals.length === 0) return null;
  if (!isRecord(raw.simulation) || typeof raw.simulation.model !== 'string') {
    return null;
  }
  const terminals = raw.terminals
    .filter((t): t is PluginComponentTypeDef['terminals'][0] => {
      if (!isRecord(t)) return false;
      return (
        typeof t.id === 'string' &&
        typeof t.label === 'string' &&
        typeof t.x === 'number' &&
        typeof t.y === 'number'
      );
    })
    .slice(0, 12);
  if (terminals.length === 0) return null;

  const propertyFields = Array.isArray(raw.propertyFields)
    ? raw.propertyFields
        .filter((f): f is PluginComponentTypeDef['propertyFields'][0] => {
          if (!isRecord(f)) return false;
          return (
            typeof f.key === 'string' &&
            typeof f.label === 'string' &&
            typeof f.type === 'string'
          );
        })
        .slice(0, 24)
    : undefined;

  const category =
    raw.category === 'Power' ||
    raw.category === 'Control' ||
    raw.category === 'Instrumentation' ||
    raw.category === 'Auxiliary'
      ? raw.category
      : 'Auxiliary';

  return {
    id: raw.id,
    label: raw.label,
    category,
    description:
      typeof raw.description === 'string' ? raw.description : undefined,
    symbol: {
      shape: raw.symbol.shape === 'circle' ? 'circle' : 'rect',
      width: Number(raw.symbol.width) || 40,
      height: Number(raw.symbol.height) || 24,
      glyph: typeof raw.symbol.glyph === 'string' ? raw.symbol.glyph : undefined,
      fill: typeof raw.symbol.fill === 'string' ? raw.symbol.fill : undefined,
      stroke:
        typeof raw.symbol.stroke === 'string' ? raw.symbol.stroke : undefined,
    },
    terminals,
    defaultProperties: isRecord(raw.defaultProperties)
      ? (raw.defaultProperties as Record<string, string | number | boolean>)
      : undefined,
    propertyFields,
    simulation: {
      model:
        raw.simulation.model === 'pass_through' ||
        raw.simulation.model === 'resistive_load' ||
        raw.simulation.model === 'open'
          ? raw.simulation.model
          : 'open',
      conductingStates: Array.isArray(raw.simulation.conductingStates)
        ? raw.simulation.conductingStates.filter(
            (s): s is 'on' | 'off' | 'tripped' | 'fault' =>
              s === 'on' || s === 'off' || s === 'tripped' || s === 'fault'
          )
        : undefined,
      defaultState:
        raw.simulation.defaultState === 'on' ||
        raw.simulation.defaultState === 'off'
          ? raw.simulation.defaultState
          : undefined,
      liveTerminal:
        typeof raw.simulation.liveTerminal === 'string'
          ? raw.simulation.liveTerminal
          : undefined,
      neutralTerminal:
        typeof raw.simulation.neutralTerminal === 'string'
          ? raw.simulation.neutralTerminal
          : undefined,
      powerProperty:
        typeof raw.simulation.powerProperty === 'string'
          ? raw.simulation.powerProperty
          : undefined,
    },
    toggleable: raw.toggleable === true,
  };
}

export function parsePluginManifest(data: unknown): PluginManifest | null {
  if (!isRecord(data)) return null;
  if (hasForbiddenKeys(data)) return null;
  if (typeof data.id !== 'string' || typeof data.name !== 'string') return null;
  if (!Array.isArray(data.componentTypes)) return null;
  const componentTypes = data.componentTypes
    .map(parseComponentType)
    .filter((t): t is PluginComponentTypeDef => t != null);
  if (componentTypes.length === 0) return null;
  const ids = new Set<string>();
  for (const t of componentTypes) {
    if (ids.has(t.id)) return null;
    ids.add(t.id);
  }
  return {
    version:
      typeof data.version === 'string' ? data.version : PLUGIN_MANIFEST_VERSION,
    id: data.id,
    name: data.name,
    author: typeof data.author === 'string' ? data.author : undefined,
    description:
      typeof data.description === 'string' ? data.description : undefined,
    minAppVersion:
      typeof data.minAppVersion === 'string' ? data.minAppVersion : undefined,
    componentTypes,
  };
}

export function checkPluginCompatibility(
  manifest: PluginManifest,
  appVersion = APP_VERSION
): PluginCompatibilityResult {
  if (manifest.version !== PLUGIN_MANIFEST_VERSION) {
    return {
      compatible: false,
      reason: `Plugin manifest v${manifest.version} is not supported (app expects v${PLUGIN_MANIFEST_VERSION}).`,
    };
  }
  if (
    manifest.minAppVersion &&
    compareSimpleVersion(appVersion, manifest.minAppVersion) < 0
  ) {
    return {
      compatible: false,
      reason: `Requires ElectroSim ${manifest.minAppVersion} or newer.`,
    };
  }
  return { compatible: true };
}

function compareSimpleVersion(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number(n) || 0);
  const pb = b.split('.').map((n) => Number(n) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export function findPluginType(
  plugins: PluginManifest[],
  pluginId: string,
  typeId: string
): PluginComponentTypeDef | null {
  const plugin = plugins.find((p) => p.id === pluginId);
  return plugin?.componentTypes.find((t) => t.id === typeId) ?? null;
}

export function mergeProjectPlugins(
  existing: PluginManifest[],
  incoming: PluginManifest
): PluginManifest[] {
  const without = existing.filter((p) => p.id !== incoming.id);
  return [...without, incoming];
}
