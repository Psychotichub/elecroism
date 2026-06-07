import React, { useCallback, useState } from 'react';
import { FiPlus, FiCopy, FiX } from 'react-icons/fi';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';

const SheetTabs: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const project = useCircuitStore((s) => s.project);
  const switchProjectSheet = useCircuitStore((s) => s.switchProjectSheet);
  const addProjectSheet = useCircuitStore((s) => s.addProjectSheet);
  const duplicateProjectSheet = useCircuitStore((s) => s.duplicateProjectSheet);
  const renameProjectSheet = useCircuitStore((s) => s.renameProjectSheet);
  const removeProjectSheet = useCircuitStore((s) => s.removeProjectSheet);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const sheets = [...project.sheets].sort((a, b) => a.sortOrder - b.sortOrder);

  const startRename = useCallback((id: string, current: string) => {
    setRenamingId(id);
    setRenameValue(current);
  }, []);

  const commitRename = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      renameProjectSheet(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  }, [renamingId, renameValue, renameProjectSheet]);

  return (
    <div
      className={`flex h-8 shrink-0 items-center gap-0.5 border-b px-2 ${tc.border} ${tc.toolbar}`}
    >
      <span
        className={`mr-1 hidden text-[10px] font-semibold uppercase tracking-wide sm:inline ${tc.textMuted}`}
      >
        {project.name}
      </span>
      {sheets.map((sheet) => {
        const active = sheet.id === project.activeSheetId;
        return (
          <div
            key={sheet.id}
            className={`group flex max-w-[140px] items-center rounded-t border px-1.5 text-xs transition-colors ${
              active
                ? 'border-b-0 bg-blue-600 text-white border-blue-600'
                : `${tc.border} ${tc.btnText} ${tc.itemHover}`
            }`}
          >
            {renamingId === sheet.id ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                className="w-full min-w-0 bg-transparent text-xs outline-none"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => switchProjectSheet(sheet.id)}
                onDoubleClick={() => startRename(sheet.id, sheet.name)}
                className="truncate py-1 pr-0.5 text-left"
                title={`${sheet.name} (double-click to rename)`}
              >
                {sheet.name}
              </button>
            )}
            {sheets.length > 1 ? (
              <button
                type="button"
                onClick={() => removeProjectSheet(sheet.id)}
                className={`shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 ${
                  active ? 'hover:bg-blue-500' : tc.itemHover
                }`}
                title="Remove sheet"
              >
                <FiX size={12} />
              </button>
            ) : null}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => addProjectSheet()}
        className={`rounded p-1 ${tc.btnText} ${tc.itemHover}`}
        title="Add sheet"
      >
        <FiPlus size={14} />
      </button>
      <button
        type="button"
        onClick={() => duplicateProjectSheet(project.activeSheetId)}
        className={`rounded p-1 ${tc.btnText} ${tc.itemHover}`}
        title="Duplicate active sheet"
      >
        <FiCopy size={14} />
      </button>
    </div>
  );
};

export default SheetTabs;
