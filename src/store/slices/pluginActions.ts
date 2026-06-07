import { buildPluginComponent } from '../../utils/pluginComponents';
import {
  checkPluginCompatibility,
  mergeProjectPlugins,
  parsePluginManifest,
} from '../../utils/pluginRegistry';
import type { CircuitStoreGet, CircuitStoreSet } from './sliceTypes';

export function createPluginActions(set: CircuitStoreSet, get: CircuitStoreGet) {
  return {
    loadProjectPlugin: (data: unknown): string | null => {
      const manifest = parsePluginManifest(data);
      if (!manifest) return 'Invalid plugin manifest (.eplugin.json).';
      const compat = checkPluginCompatibility(manifest);
      if (!compat.compatible) return compat.reason ?? 'Plugin is not compatible.';
      set((state) => ({
        project: {
          ...state.project,
          plugins: mergeProjectPlugins(state.project.plugins ?? [], manifest),
          updatedAt: new Date().toISOString(),
        },
      }));
      return null;
    },

    removeProjectPlugin: (pluginId: string) => {
      set((state) => ({
        project: {
          ...state.project,
          plugins: (state.project.plugins ?? []).filter((p) => p.id !== pluginId),
          updatedAt: new Date().toISOString(),
        },
      }));
    },

    addPluginComponent: (
      pluginId: string,
      typeId: string,
      x: number,
      y: number
    ): boolean => {
      const plugins = get().project.plugins ?? [];
      const comp = buildPluginComponent(plugins, pluginId, typeId, x, y);
      if (!comp) return false;
      set((state) => ({
        circuit: {
          ...state.circuit,
          components: [...state.circuit.components, comp],
          updatedAt: new Date().toISOString(),
        },
      }));
      get().pushHistory(`Added plugin ${typeId}`);
      get().runSimulation();
      return true;
    },

    loadExamplePlugin: async (): Promise<string | null> => {
      try {
        const res = await fetch('/plugins/example-warning-beacon.eplugin.json');
        if (!res.ok) {
          return get().loadProjectPlugin(
            (await import('../../plugins/bundledExamplePlugin')).EXAMPLE_PLUGIN_MANIFEST
          );
        }
        const data = (await res.json()) as unknown;
        return get().loadProjectPlugin(data);
      } catch {
        return get().loadProjectPlugin(
          (await import('../../plugins/bundledExamplePlugin')).EXAMPLE_PLUGIN_MANIFEST
        );
      }
    },
  };
}
