import React, { useCallback, useState } from 'react';
import { AppIcon } from '../ui';
import { cn } from '../ui/cn';
import { useCircuitStore } from '../../store/circuitStore';
import { isSheetDirty } from '../../utils/sheetDirtyState';

const SheetTabs: React.FC = () => {
  const project = useCircuitStore((s) => s.project);
  const circuit = useCircuitStore((s) => s.circuit);
  const baselines = useCircuitStore((s) => s.sheetSaveBaselines);
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
    <div className="es-sheet-tabs">
      <div className="flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto px-2 pt-1">
        {sheets.map((sheet) => {
          const active = sheet.id === project.activeSheetId;
          const dirty = isSheetDirty(
            sheet.id,
            project,
            circuit,
            baselines
          );
          return (
            <div
              key={sheet.id}
              className={cn(
                'group flex max-w-[9.5rem] shrink-0 items-center rounded-t-es-sm border border-b-0 px-1.5 es-typo-body-sm transition-colors duration-[var(--es-motion-fast)] motion-reduce:transition-none',
                active
                  ? 'es-sheet-tab-active -mb-px z-[1]'
                  : 'es-sheet-tab-inactive'
              )}
            >
              {dirty ? (
                <span
                  className="mr-1 h-1.5 w-1.5 shrink-0 rounded-full bg-es-warning"
                  title="Unsaved changes"
                  aria-label="Unsaved changes"
                />
              ) : null}
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
                  className="w-full min-w-0 bg-transparent outline-none es-focus-ring"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => switchProjectSheet(sheet.id)}
                  onDoubleClick={() => startRename(sheet.id, sheet.name)}
                  className="min-w-0 truncate py-1 pr-0.5 text-left es-focus-ring"
                  title={`${sheet.name} (double-click to rename)`}
                >
                  {sheet.name}
                </button>
              )}
              {sheets.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeProjectSheet(sheet.id)}
                  className="shrink-0 rounded-es-sm p-0.5 text-es-secondary opacity-60 transition-opacity hover:opacity-100 es-focus-ring hover:bg-es-hover"
                  title="Remove sheet"
                >
                  <AppIcon id="close" size="inline" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="flex shrink-0 items-center gap-0.5 px-2">
        <button
          type="button"
          onClick={() => addProjectSheet()}
          className="rounded-es-sm p-1 text-es-secondary es-focus-ring hover:bg-es-hover hover:text-es-primary"
          title="Add sheet"
        >
          <span className="es-icon-toolbar">
            <AppIcon id="add" />
          </span>
        </button>
        <button
          type="button"
          onClick={() => duplicateProjectSheet(project.activeSheetId)}
          className="rounded-es-sm p-1 text-es-secondary es-focus-ring hover:bg-es-hover hover:text-es-primary"
          title="Duplicate active sheet"
        >
          <span className="es-icon-inline">
            <AppIcon id="copy" size="inline" />
          </span>
        </button>
      </div>
    </div>
  );
};

export default SheetTabs;
