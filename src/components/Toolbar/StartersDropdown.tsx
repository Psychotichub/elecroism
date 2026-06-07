import React, { useState } from 'react';
import { AppIcon } from '../ui';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { listCircuitTemplates } from '../../utils/circuitTemplates';

interface StartersDropdownProps {
  inactiveClassName: string;
}

const StartersDropdown: React.FC<StartersDropdownProps> = ({
  inactiveClassName,
}) => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const insertCircuitTemplate = useCircuitStore((s) => s.insertCircuitTemplate);
  const [open, setOpen] = useState(false);
  const templates = listCircuitTemplates();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition-colors ${
          open ? 'bg-blue-600 text-white' : inactiveClassName
        }`}
        title="Insert starter templates at cursor (DOL, Y-Δ, VFD, ATS)"
      >
        <span className="es-icon-toolbar">
          <AppIcon id="starter" />
        </span>
        <span className="hidden lg:inline">Starters</span>
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Close starters menu"
            onClick={() => setOpen(false)}
          />
          <div
            className={`absolute left-0 top-full z-40 mt-1 min-w-[220px] rounded-md border shadow-lg ${tc.border} ${tc.toolbar}`}
          >
            <p className={`px-3 py-1.5 text-[9px] ${tc.textMuted}`}>
              Hover canvas, then pick a pattern to insert at the cursor.
            </p>
            <ul className={`border-t ${tc.border}`}>
              {templates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      insertCircuitTemplate(t.id);
                      setOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs ${tc.text} ${tc.itemHover}`}
                  >
                    {t.name}
                    <span className={`block text-[10px] ${tc.textMuted}`}>
                      {t.description}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default StartersDropdown;
