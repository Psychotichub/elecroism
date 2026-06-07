import React, { useEffect, useState } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { loadAutosave } from '../../utils/projectPersistence';
import {
  formatSnapshotTime,
  listProjectSnapshots,
  type ProjectSnapshotSummary,
} from '../../utils/projectSnapshots';

interface RestoreSessionDialogProps {
  open: boolean;
  onClose: () => void;
}

const RestoreSessionDialog: React.FC<RestoreSessionDialogProps> = ({
  open,
  onClose,
}) => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const restoreAutosavedProject = useCircuitStore(
    (s) => s.restoreAutosavedProject
  );
  const restoreProjectSnapshot = useCircuitStore(
    (s) => s.restoreProjectSnapshot
  );
  const discardAutosavedProject = useCircuitStore(
    (s) => s.discardAutosavedProject
  );

  const [snapshots, setSnapshots] = useState<ProjectSnapshotSummary[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    void listProjectSnapshots(12).then((list) => {
      setSnapshots(list);
      setSelectedSnapshotId(list[0]?.id ?? '');
    });
  }, [open]);

  if (!open) return null;

  const autosave = loadAutosave();
  const autosaveLabel = autosave?.name ?? 'Untitled Project';
  const autosaveSheets = autosave?.sheets.length ?? 0;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
      <div
        className={`max-w-lg rounded-lg border p-4 shadow-xl ${tc.border} ${tc.panel} ${tc.text}`}
        role="dialog"
        aria-labelledby="restore-session-title"
      >
        <h2
          id="restore-session-title"
          className={`text-sm font-bold ${tc.textBright}`}
        >
          Restore previous session?
        </h2>
        <p className={`mt-2 text-xs leading-snug ${tc.textMuted}`}>
          Recover unsaved work from the latest autosave or a versioned local
          snapshot (stored separately from undo history).
        </p>

        {autosave ? (
          <div className={`mt-3 rounded border p-2 ${tc.border}`}>
            <p className={`text-[10px] font-semibold ${tc.textBright}`}>
              Latest autosave
            </p>
            <p className={`text-[10px] ${tc.textMuted}`}>
              <strong>{autosaveLabel}</strong>
              {autosaveSheets > 1 ? ` (${autosaveSheets} sheets)` : ''}
            </p>
            <button
              type="button"
              onClick={() => {
                restoreAutosavedProject();
                onClose();
              }}
              className="mt-2 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
            >
              Restore autosave
            </button>
          </div>
        ) : null}

        {snapshots.length > 0 ? (
          <div className={`mt-3 rounded border p-2 ${tc.border}`}>
            <p className={`mb-1 text-[10px] font-semibold ${tc.textBright}`}>
              Versioned snapshots
            </p>
            <select
              value={selectedSnapshotId}
              onChange={(e) => setSelectedSnapshotId(e.target.value)}
              className="input-field mb-2 w-full py-1 text-xs"
            >
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} — {formatSnapshotTime(s.savedAt)} ({s.projectName})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!selectedSnapshotId}
              onClick={() => {
                void restoreProjectSnapshot(selectedSnapshotId).then((ok) => {
                  if (ok) onClose();
                });
              }}
              className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              Restore selected snapshot
            </button>
          </div>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              discardAutosavedProject();
              onClose();
            }}
            className={`rounded px-3 py-1.5 text-xs ${tc.btnBg} ${tc.btnHover}`}
          >
            Start fresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestoreSessionDialog;
