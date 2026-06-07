import React, { useState } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useUiStore } from '../../store/uiStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import type { ComponentMacro } from '../../utils/componentMacros';
import { loadComponentMacros } from '../../utils/componentMacros';
import type { LibraryMergeMode } from '../../utils/componentLibraryPack';

const ComponentLibrarySection: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const project = useCircuitStore((s) => s.project);
  const insertMacro = useCircuitStore((s) => s.insertMacro);
  const saveSelectionAsMacro = useCircuitStore((s) => s.saveSelectionAsMacro);
  const updateLibraryMacro = useCircuitStore((s) => s.updateLibraryMacro);
  const updateLibraryMacroComponent = useCircuitStore(
    (s) => s.updateLibraryMacroComponent
  );
  const removeLibraryMacro = useCircuitStore((s) => s.removeLibraryMacro);
  const exportProjectLibraryPack = useCircuitStore(
    (s) => s.exportProjectLibraryPack
  );
  const importProjectLibraryPack = useCircuitStore(
    (s) => s.importProjectLibraryPack
  );
  const importGlobalMacrosToProject = useCircuitStore(
    (s) => s.importGlobalMacrosToProject
  );
  const setLibraryPackBrowserOpen = useUiStore(
    (s) => s.setLibraryPackBrowserOpen
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editCompId, setEditCompId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const library = project.library;
  const globalCount = loadComponentMacros().length;

  const handleSaveSelection = () => {
    const name = window.prompt('Macro name (e.g. DOL starter)');
    if (!name?.trim()) return;
    if (saveSelectionAsMacro(name.trim())) {
      setMsg(`Saved "${name.trim()}" to project library.`);
    } else {
      setMsg('Select components on the canvas first.');
    }
  };

  const handleImportPack = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.elib.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string) as unknown;
          const merge = window.confirm(
            'OK = merge into library. Cancel = replace entire library.'
          )
            ? ('merge' as LibraryMergeMode)
            : ('replace' as LibraryMergeMode);
          if (importProjectLibraryPack(data, merge)) {
            setMsg(`Imported library pack (${merge}).`);
          } else {
            setMsg('Invalid library pack file.');
          }
        } catch {
          setMsg('Could not parse library file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const renderMacroEditor = (macro: ComponentMacro) => {
    const comp = macro.components.find((c) => c.id === editCompId);
    if (!comp) return null;
    const terminalStr = comp.connectionPoints.map((p) => p.label).join(', ');
    return (
      <div
        className={`mt-2 rounded border p-2 ${tc.border} ${
          theme === 'dark' ? 'bg-black/20' : 'bg-gray-50'
        }`}
      >
        <p className={`mb-1 text-[10px] font-semibold ${tc.textBright}`}>
          Edit {comp.type} — {comp.label}
        </p>
        <label className={`block text-[9px] ${tc.textMuted}`}>Label</label>
        <input
          type="text"
          defaultValue={comp.label}
          onBlur={(e) =>
            updateLibraryMacroComponent(macro.id, comp.id, {
              label: e.target.value,
            })
          }
          className="input-field mb-1 w-full py-0.5 text-[10px]"
        />
        <label className={`block text-[9px] ${tc.textMuted}`}>
          Terminals (comma-separated)
        </label>
        <input
          type="text"
          defaultValue={terminalStr}
          onBlur={(e) =>
            updateLibraryMacroComponent(macro.id, comp.id, {
              terminalLabels: e.target.value,
            })
          }
          className="input-field mb-1 w-full py-0.5 text-[10px]"
        />
        <label className={`block text-[9px] ${tc.textMuted}`}>
          Rating (A)
        </label>
        <input
          type="number"
          min={0}
          defaultValue={comp.properties.ratingAmps ?? ''}
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (!Number.isFinite(v)) return;
            updateLibraryMacroComponent(macro.id, comp.id, {
              properties: { ratingAmps: v },
            });
          }}
          className="input-field w-full py-0.5 text-[10px]"
        />
      </div>
    );
  };

  return (
    <div className={`rounded-md border p-2 ${tc.border}`}>
      <h3
        className={`mb-1.5 text-[11px] font-bold uppercase tracking-wide ${tc.textMuted}`}
      >
        Component library
      </h3>
      <p className={`mb-2 text-[10px] leading-snug ${tc.textMuted}`}>
        Reusable macros with custom labels, terminals, and ratings. Export{' '}
        <code className="text-[9px]">.elib.json</code> packs to share between
        machines.
      </p>

      <div className="mb-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={handleSaveSelection}
          className="rounded bg-slate-600 px-2 py-1 text-[10px] text-white hover:bg-slate-500"
        >
          Save selection
        </button>
        <button
          type="button"
          onClick={() => {
            if (exportProjectLibraryPack()) setMsg('Library pack downloaded.');
            else setMsg('Library is empty.');
          }}
          className="rounded bg-indigo-700 px-2 py-1 text-[10px] text-white hover:bg-indigo-600"
        >
          Export pack
        </button>
        <button
          type="button"
          onClick={handleImportPack}
          className="rounded bg-indigo-700 px-2 py-1 text-[10px] text-white hover:bg-indigo-600"
        >
          Import pack
        </button>
        <button
          type="button"
          onClick={() => setLibraryPackBrowserOpen(true)}
          className="rounded bg-emerald-800 px-2 py-1 text-[10px] text-white hover:bg-emerald-700"
        >
          Get packs…
        </button>
        {globalCount > 0 && library.length === 0 ? (
          <button
            type="button"
            onClick={() => {
              const n = importGlobalMacrosToProject();
              setMsg(
                n > 0
                  ? `Imported ${n} macro(s) from global storage.`
                  : 'No new macros to import.'
              );
            }}
            className="rounded bg-slate-600 px-2 py-1 text-[10px] text-white hover:bg-slate-500"
          >
            Import legacy macros ({globalCount})
          </button>
        ) : null}
      </div>

      {library.length === 0 ? (
        <p className={`text-[10px] ${tc.textMuted}`}>
          No macros in this project yet.
        </p>
      ) : (
        <ul className="max-h-56 space-y-1 overflow-y-auto">
          {library.map((macro) => (
            <li
              key={macro.id}
              className={`rounded border p-1.5 ${tc.border}`}
            >
              <div className="flex items-start justify-between gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId((id) => (id === macro.id ? null : macro.id))
                  }
                  className={`min-w-0 flex-1 text-left text-[10px] font-medium ${tc.text}`}
                >
                  {macro.name}
                  <span className={`block text-[9px] font-normal ${tc.textMuted}`}>
                    {macro.components.length} comp.
                    {macro.wires.length > 0
                      ? `, ${macro.wires.length} wires`
                      : ''}
                    {macro.description ? ` — ${macro.description}` : ''}
                  </span>
                </button>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => insertMacro(macro.id)}
                    className="rounded bg-emerald-700 px-1.5 py-0.5 text-[9px] text-white hover:bg-emerald-600"
                  >
                    Insert
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete macro "${macro.name}"?`)) {
                        removeLibraryMacro(macro.id);
                        setMsg('Macro removed.');
                      }
                    }}
                    className="rounded bg-red-900/80 px-1.5 py-0.5 text-[9px] text-white hover:bg-red-800"
                  >
                    Del
                  </button>
                </div>
              </div>

              {expandedId === macro.id ? (
                <div className="mt-2 space-y-1">
                  <input
                    type="text"
                    defaultValue={macro.description ?? ''}
                    placeholder="Description"
                    onBlur={(e) =>
                      updateLibraryMacro(macro.id, {
                        description: e.target.value,
                      })
                    }
                    className="input-field w-full py-0.5 text-[10px]"
                  />
                  <table className="w-full text-left text-[9px]">
                    <thead>
                      <tr className={tc.textMuted}>
                        <th className="pr-1">Type</th>
                        <th className="pr-1">Label</th>
                        <th>Terminals</th>
                      </tr>
                    </thead>
                    <tbody>
                      {macro.components.map((c) => (
                        <tr key={c.id}>
                          <td className="pr-1">{c.type}</td>
                          <td className="pr-1">{c.label}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() =>
                                setEditCompId(
                                  editCompId === c.id ? null : c.id
                                )
                              }
                              className="text-blue-400 hover:underline"
                            >
                              {c.connectionPoints.length} — edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {editCompId &&
                  macro.components.some((c) => c.id === editCompId)
                    ? renderMacroEditor(macro)
                    : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {msg ? <p className={`mt-2 text-[10px] ${tc.textMuted}`}>{msg}</p> : null}
    </div>
  );
};

export default ComponentLibrarySection;
