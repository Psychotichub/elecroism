import { describe, expect, it } from 'vitest';
import { EXAMPLE_PLUGIN_MANIFEST } from '../../plugins/bundledExamplePlugin';
import {
  checkPluginCompatibility,
  findPluginType,
  mergeProjectPlugins,
  parsePluginManifest,
} from '../pluginRegistry';

describe('pluginRegistry', () => {
  it('parses the example manifest', () => {
    const manifest = parsePluginManifest(EXAMPLE_PLUGIN_MANIFEST);
    expect(manifest?.id).toBe('com.electrosim.example-warning-beacon');
    expect(manifest?.componentTypes).toHaveLength(2);
  });

  it('rejects manifests with forbidden executable keys', () => {
    const bad = {
      ...EXAMPLE_PLUGIN_MANIFEST,
      componentTypes: [
        {
          ...EXAMPLE_PLUGIN_MANIFEST.componentTypes[0],
          simulation: { model: 'open', script: 'alert(1)' },
        },
      ],
    };
    expect(parsePluginManifest(bad)).toBeNull();
  });

  it('checks manifest version compatibility', () => {
    const manifest = parsePluginManifest(EXAMPLE_PLUGIN_MANIFEST);
    expect(manifest).not.toBeNull();
    expect(checkPluginCompatibility(manifest!).compatible).toBe(true);
    expect(
      checkPluginCompatibility({ ...manifest!, version: '9.0' }).compatible
    ).toBe(false);
  });

  it('merges plugins by id and resolves types', () => {
    const manifest = parsePluginManifest(EXAMPLE_PLUGIN_MANIFEST)!;
    const merged = mergeProjectPlugins([], manifest);
    expect(merged).toHaveLength(1);
    const typeDef = findPluginType(merged, manifest.id, 'warning_beacon');
    expect(typeDef?.simulation.model).toBe('resistive_load');
    const replaced = mergeProjectPlugins(merged, {
      ...manifest,
      name: 'Renamed pack',
    });
    expect(replaced[0].name).toBe('Renamed pack');
  });
});
