import React, { useCallback, useEffect, useState } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import type { ProjectSnapshotSummary } from '../../utils/projectSnapshots';
import { formatSnapshotTime } from '../../utils/projectSnapshots';
import type { ProjectSnapshotCompareResult } from '../../utils/projectSnapshotDiff';
import SnapshotDiffDialog from '../Dialogs/SnapshotDiffDialog';

const ProjectSnapshotsSection: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const project = useCircuitStore((s) => s.project);
  const createProjectSnapshot = useCircuitStore((s) => s.createProjectSnapshot);
  const listStoredSnapshots = useCircuitStore((s) => s.listStoredSnapshots);
  const restoreProjectSnapshot = useCircuitStore((s) => s.restoreProjectSnapshot);
  const deleteProjectSnapshot = useCircuitStore((s) => s.deleteProjectSnapshot);
  const renameProjectSnapshot = useCircuitStore((s) => s.renameProjectSnapshot);
  const compareProjectSnapshot = useCircuitStore((s) => s.compareProjectSnapshot);

  const [snapshots, setSnapshots] = useState<ProjectSnapshotSummary[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [activeCompare, setActiveCompare] =
    useState<ProjectSnapshotCompareResult | null>(null);

  const refresh = useCallback(async () => {
    setSnapshots(await listStoredSnapshots());
  }, [listStoredSnapshots]);

  useEffect(() => {
    let cancelled = false;
    void listStoredSnapshots().then((list) => {
      if (!cancelled) setSnapshots(list);
    });
    return () => {
      cancelled = true;
    };
  }, [listStoredSnapshots, project.updatedAt]);

  const handleCreate = useCallback(async () => {
    const label = window.prompt(
      'Snapshot label (e.g. Rev A, Rev B)',
      'Manual snapshot'
    );
    if (label === null) return;
    const ok = await createProjectSnapshot(label.trim() || 'Manual snapshot');
    setMsg(ok ? 'Snapshot saved to local storage.' : 'Could not save snapshot.');
    await refresh();
  }, [createProjectSnapshot, refresh]);

  const handleRename = useCallback(
    async (id: string, current: string) => {
      const label = window.prompt('Revision label', current);
      if (label === null || !label.trim()) return;
      const ok = await renameProjectSnapshot(id, label.trim());
      setMsg(ok ? 'Snapshot label updated.' : 'Could not rename snapshot.');
      await refresh();
    },
    [renameProjectSnapshot, refresh]
  );

  const handleCompare = useCallback(
    async (id: string) => {
      const result = await compareProjectSnapshot(id);
      if (!result) {
        setMsg('Could not compare snapshot.');
        return;
      }
      setActiveCompare(result);
      setMsg(null);
    },
    [compareProjectSnapshot]
  );

  return (
    <>
      <div className={`rounded-md border p-2 ${tc.border}`}>
        <h3
          className={`mb-1.5 text-[11px] font-bold uppercase tracking-wide ${tc.textMuted}`}
        >
          Versioned snapshots
        </h3>
        <p className={`mb-2 text-[10px] leading-snug ${tc.textMuted}`}>
          IndexedDB snapshots are separate from undo history. Label revisions
          (Rev A, Rev B), compare against the current project, and export a
          change summary.
        </p>
        <button
          type="button"
          onClick={() => void handleCreate()}
          className="mb-2 rounded bg-indigo-700 px-2 py-1 text-[10px] text-white hover:bg-indigo-600"
        >
          Create snapshot now
        </button>
        {snapshots.length === 0 ? (
          <p className={`text-[10px] ${tc.textMuted}`}>No snapshots yet.</p>
        ) : (
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {snapshots.map((s) => (
              <li
                key={s.id}
                className={`flex items-center justify-between gap-1 rounded border px-1.5 py-1 ${tc.border}`}
              >
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="truncate text-left text-[10px] font-medium hover:underline"
                    title="Rename revision label"
                    onClick={() => void handleRename(s.id, s.label)}
                  >
                    {s.label}
                  </button>
                  <div className={`truncate text-[9px] ${tc.textMuted}`}>
                    {formatSnapshotTime(s.savedAt)} · {s.projectName} ·{' '}
                    {s.sheetCount} sheet{s.sheetCount === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-0.5">
                  <button
                    type="button"
                    onClick={() => void handleCompare(s.id)}
                    className="rounded bg-sky-800 px-1.5 py-0.5 text-[9px] text-white hover:bg-sky-700"
                  >
                    Compare
                  </button>
                  <button
                    type="button"
                    onClick={() => void restoreProjectSnapshot(s.id)}
                    className="rounded bg-slate-600 px-1.5 py-0.5 text-[9px] text-white hover:bg-slate-500"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteProjectSnapshot(s.id);
                      await refresh();
                    }}
                    className="rounded bg-red-900/80 px-1.5 py-0.5 text-[9px] text-white hover:bg-red-800"
                  >
                    Del
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {msg ? <p className={`mt-2 text-[10px] ${tc.textMuted}`}>{msg}</p> : null}
      </div>
      {activeCompare ? (
        <SnapshotDiffDialog
          diff={activeCompare.diff}
          baseProject={activeCompare.baseProject}
          onClose={() => setActiveCompare(null)}
        />
      ) : null}
    </>
  );
};

export default ProjectSnapshotsSection;
