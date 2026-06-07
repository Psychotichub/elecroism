import React, { useState } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';

const PluginsSection: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const project = useCircuitStore((s) => s.project);
  const circuit = useCircuitStore((s) => s.circuit);
  const loadProjectPlugin = useCircuitStore((s) => s.loadProjectPlugin);
  const removeProjectPlugin = useCircuitStore((s) => s.removeProjectPlugin);
  const addPluginComponent = useCircuitStore((s) => s.addPluginComponent);
  const loadExamplePlugin = useCircuitStore((s) => s.loadExamplePlugin);

  const [expandedPluginId, setExpandedPluginId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const plugins = project.plugins ?? [];

  const handleLoadFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.eplugin.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string) as unknown;
          const err = loadProjectPlugin(data);
          setMsg(err ?? `Loaded plugin "${file.name}".`);
        } catch {
          setMsg('Could not parse plugin file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleLoadExample = async () => {
    const err = await loadExamplePlugin();
    setMsg(err ?? 'Loaded example warning-beacon plugin.');
  };

  const handleInsert = (pluginId: string, typeId: string) => {
    const existing = circuit.components.filter(
      (c) =>
        c.type === 'plugin_component' &&
        c.properties.pluginId === pluginId &&
        c.properties.pluginTypeId === typeId
    ).length;
    const x = 200 + existing * 36;
    const y = 180 + existing * 28;
    if (addPluginComponent(pluginId, typeId, x, y)) {
      setMsg(`Placed ${typeId} on canvas.`);
    } else {
      setMsg('Could not insert plugin component.');
    }
  };

  return (
    <div className={`rounded-md border p-2 ${tc.border}`}>
      <h3
        className={`mb-1.5 text-[11px] font-bold uppercase tracking-wide ${tc.textMuted}`}
      >
        Plugins (v1)
      </h3>
      <p className={`mb-2 text-[10px] leading-snug ${tc.textMuted}`}>
        Load JSON plugin packs (<code className="text-[9px]">.eplugin.json</code>)
        to add custom symbols, property editors, and sandboxed simulation models.
        See <code className="text-[9px]">plugins/README.md</code> for the manifest
        format.
      </p>

      <div className="mb-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={handleLoadFile}
          className="rounded bg-indigo-700 px-2 py-1 text-[10px] text-white hover:bg-indigo-600"
        >
          Load plugin…
        </button>
        <button
          type="button"
          onClick={() => void handleLoadExample()}
          className="rounded bg-emerald-800 px-2 py-1 text-[10px] text-white hover:bg-emerald-700"
        >
          Load example pack
        </button>
      </div>

      {msg ? (
        <p className={`mb-2 text-[10px] ${tc.textMuted}`}>{msg}</p>
      ) : null}

      {plugins.length === 0 ? (
        <p className={`text-[10px] ${tc.textMuted}`}>
          No plugins loaded in this project.
        </p>
      ) : (
        <ul className="max-h-56 space-y-1 overflow-y-auto">
          {plugins.map((plugin) => (
            <li
              key={plugin.id}
              className={`rounded border p-1.5 ${tc.border}`}
            >
              <div className="flex items-start justify-between gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedPluginId((id) =>
                      id === plugin.id ? null : plugin.id
                    )
                  }
                  className={`min-w-0 flex-1 text-left text-[10px] font-medium ${tc.text}`}
                >
                  {plugin.name}
                  <span className={`ml-1 font-normal ${tc.textMuted}`}>
                    ({plugin.componentTypes.length} type
                    {plugin.componentTypes.length === 1 ? '' : 's'})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeProjectPlugin(plugin.id);
                    setMsg(`Removed plugin "${plugin.name}".`);
                  }}
                  className="shrink-0 rounded px-1.5 py-0.5 text-[9px] text-red-400 hover:bg-red-900/30"
                  title="Remove plugin from project"
                >
                  Remove
                </button>
              </div>
              {plugin.description ? (
                <p className={`mt-0.5 text-[9px] ${tc.textMuted}`}>
                  {plugin.description}
                </p>
              ) : null}
              {expandedPluginId === plugin.id ? (
                <ul className="mt-1.5 space-y-1 border-t pt-1.5">
                  {plugin.componentTypes.map((typeDef) => (
                    <li
                      key={typeDef.id}
                      className={`flex items-center justify-between gap-2 rounded px-1 py-0.5 ${
                        theme === 'dark' ? 'bg-black/20' : 'bg-gray-50'
                      }`}
                    >
                      <span className={`text-[10px] ${tc.text}`}>
                        {typeDef.label}
                        <span className={`ml-1 ${tc.textMuted}`}>
                          {typeDef.simulation.model}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleInsert(plugin.id, typeDef.id)}
                        className="shrink-0 rounded bg-slate-600 px-2 py-0.5 text-[9px] text-white hover:bg-slate-500"
                      >
                        Insert
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PluginsSection;
