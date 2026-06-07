import React, { useCallback, useState } from 'react';
import { FiLayers, FiPlus } from 'react-icons/fi';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import type { ComponentMacro } from '../../utils/componentMacros';

const MacroDropdown: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const saveSelectionAsMacro = useCircuitStore((s) => s.saveSelectionAsMacro);
  const insertMacro = useCircuitStore((s) => s.insertMacro);
  const listMacros = useCircuitStore((s) => s.listMacros);
  const [open, setOpen] = useState(false);
  const [macros, setMacros] = useState<ComponentMacro[]>([]);

  const refresh = useCallback(() => {
    setMacros(listMacros());
  }, [listMacros]);

  const onSave = () => {
    const name = window.prompt('Macro name (e.g. DOL starter)');
    if (!name?.trim()) return;
    if (saveSelectionAsMacro(name.trim())) {
      refresh();
      setOpen(true);
    } else {
      window.alert('Select one or more components on the canvas first.');
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          refresh();
          setOpen((v) => !v);
        }}
        className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition-colors ${tc.btnText} ${tc.btnHover}`}
        title="Reusable component groups (macros)"
      >
        <FiLayers />
        <span className="hidden lg:inline">Macros</span>
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Close macros menu"
            onClick={() => setOpen(false)}
          />
          <div
            className={`absolute left-0 top-full z-40 mt-1 min-w-[200px] rounded-md border shadow-lg ${tc.border} ${tc.toolbar}`}
          >
            <button
              type="button"
              onClick={onSave}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs ${tc.text} ${tc.itemHover}`}
            >
              <FiPlus className="shrink-0" />
              Save selection as macro…
            </button>
            <p className={`border-t px-3 py-1.5 text-[9px] ${tc.border} ${tc.textMuted}`}>
              Manage, import/export packs in Validation → Component library.
            </p>
            {macros.length === 0 ? (
              <p className={`px-3 py-2 text-[10px] ${tc.textMuted}`}>
                No saved macros yet.
              </p>
            ) : (
              <ul className={`max-h-48 overflow-y-auto border-t ${tc.border}`}>
                {macros.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        insertMacro(m.id);
                        setOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs ${tc.text} ${tc.itemHover}`}
                    >
                      {m.name}
                      <span className={`block text-[10px] ${tc.textMuted}`}>
                        {m.components.length} comp.
                        {m.wires.length > 0 ? `, ${m.wires.length} wires` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MacroDropdown;
