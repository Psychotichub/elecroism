import React, { useMemo, useState } from 'react';
import { FiDownload, FiX } from 'react-icons/fi';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { useUiStore } from '../../store/uiStore';
import { useCircuitStore } from '../../store/circuitStore';
import type { ElectroProject } from '../../types/project';
import type { ProjectSnapshotDiff } from '../../utils/projectSnapshotDiff';
import {
  circuitForProjectSheet,
  visualDiffForSheet,
} from '../../utils/projectSnapshotDiff';
import { downloadSnapshotDiffReport } from '../../utils/snapshotDiffExport';
import SnapshotDiffSheetPreview from '../Canvas/SnapshotDiffSheetPreview';

type ViewMode = 'summary' | 'sideBySide';

type Props = {
  diff: ProjectSnapshotDiff;
  baseProject: ElectroProject;
  onClose: () => void;
};

const SnapshotDiffDialog: React.FC<Props> = ({
  diff,
  baseProject,
  onClose,
}) => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const project = useCircuitStore((s) => s.project);
  const circuit = useCircuitStore((s) => s.circuit);
  const setSnapshotDiffOverlay = useUiStore((s) => s.setSnapshotDiffOverlay);
  const [overlayOn, setOverlayOn] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [revisionLabel, setRevisionLabel] = useState(diff.baseLabel);

  const activeSheetName = circuit.name;

  const sheetOptions = useMemo(
    () =>
      diff.sheets.filter(
        (s) =>
          s.sheetAdded ||
          s.sheetRemoved ||
          s.components.length > 0 ||
          s.wires.length > 0
      ),
    [diff.sheets]
  );

  const [previewSheet, setPreviewSheet] = useState(
    () =>
      sheetOptions.find((s) => s.sheetName === activeSheetName)?.sheetName ??
      sheetOptions[0]?.sheetName ??
      activeSheetName
  );

  const previewVisual = useMemo(
    () => visualDiffForSheet(diff, previewSheet),
    [diff, previewSheet]
  );

  const baseCircuit = useMemo(
    () => circuitForProjectSheet(baseProject, previewSheet),
    [baseProject, previewSheet]
  );

  const compareCircuit = useMemo(() => {
    const sheet = project.sheets.find(
      (s) => s.name.trim().toLowerCase() === previewSheet.trim().toLowerCase()
    );
    return sheet?.circuit ?? (previewSheet === activeSheetName ? circuit : null);
  }, [project.sheets, previewSheet, activeSheetName, circuit]);

  const applyOverlay = (enabled: boolean, sheetName = activeSheetName) => {
    setOverlayOn(enabled);
    if (!enabled) {
      setSnapshotDiffOverlay(null);
      return;
    }
    const visual = visualDiffForSheet(diff, sheetName);
    setSnapshotDiffOverlay(visual);
  };

  React.useEffect(() => {
    if (overlayOn) {
      const visual = visualDiffForSheet(diff, activeSheetName);
      setSnapshotDiffOverlay(visual);
    }
    return () => setSnapshotDiffOverlay(null);
  }, [diff, activeSheetName, overlayOn, setSnapshotDiffOverlay]);

  const dialogWidth =
    viewMode === 'sideBySide' ? 'max-w-5xl' : 'max-w-3xl';

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="snapshot-diff-title"
        aria-modal="true"
        className={`flex max-h-[90vh] w-full ${dialogWidth} flex-col overflow-hidden rounded-lg border shadow-xl ${tc.border} ${tc.panel}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between border-b px-4 py-3 ${tc.border}`}
        >
          <div>
            <h2
              id="snapshot-diff-title"
              className={`text-sm font-semibold ${tc.textBright}`}
            >
              Snapshot diff
            </h2>
            <p className={`text-[10px] ${tc.textMuted}`}>
              {diff.baseLabel} → {diff.compareLabel}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className={`rounded p-1 ${tc.textMuted} ${tc.itemHover}`}
          >
            <FiX size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-[10px]">
            <Stat label="Added" value={diff.summary.componentsAdded} color="text-green-400" />
            <Stat label="Removed" value={diff.summary.componentsRemoved} color="text-red-400" />
            <Stat label="Moved" value={diff.summary.componentsMoved} color="text-amber-400" />
            <Stat label="Modified" value={diff.summary.componentsModified} color="text-sky-400" />
          </div>

          <div className={`flex flex-wrap items-center gap-3 text-[11px] ${tc.text}`}>
            <span className={tc.textMuted}>View:</span>
            <label className="inline-flex items-center gap-1">
              <input
                type="radio"
                name="diff-view"
                checked={viewMode === 'summary'}
                onChange={() => setViewMode('summary')}
              />
              Summary list
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="radio"
                name="diff-view"
                checked={viewMode === 'sideBySide'}
                onChange={() => setViewMode('sideBySide')}
              />
              Side by side
            </label>
          </div>

          <label className={`flex items-center gap-2 text-[11px] ${tc.text}`}>
            <input
              type="checkbox"
              checked={overlayOn}
              onChange={(e) => applyOverlay(e.target.checked)}
            />
            Show overlay on canvas (active sheet: {activeSheetName})
          </label>

          {viewMode === 'sideBySide' ? (
            <div className="space-y-2">
              <label className={`block text-[11px] ${tc.text}`}>
                Sheet
                <select
                  value={previewSheet}
                  onChange={(e) => setPreviewSheet(e.target.value)}
                  className={`mt-1 w-full rounded border px-2 py-1 text-xs ${tc.inputBorder} ${tc.inputBg} ${tc.inputText}`}
                >
                  {diff.sheets.map((s) => (
                    <option key={s.sheetName} value={s.sheetName}>
                      {s.sheetName}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <SnapshotDiffSheetPreview
                  circuit={baseCircuit}
                  label={diff.baseLabel}
                  width={280}
                  height={220}
                  emphasis="base"
                  visual={previewVisual}
                />
                <SnapshotDiffSheetPreview
                  circuit={compareCircuit}
                  label={diff.compareLabel}
                  width={280}
                  height={220}
                  emphasis="compare"
                  visual={previewVisual}
                />
              </div>
              <p className={`text-[9px] ${tc.textMuted}`}>
                Green = added · Red = removed · Amber = moved · Blue = modified
                (components and wires)
              </p>
            </div>
          ) : null}

          <label className={`block text-[11px] ${tc.text}`}>
            Revision label for export
            <input
              type="text"
              value={revisionLabel}
              onChange={(e) => setRevisionLabel(e.target.value)}
              className={`mt-1 w-full rounded border px-2 py-1 text-xs ${tc.inputBorder} ${tc.inputBg} ${tc.inputText}`}
              placeholder="Rev B"
            />
          </label>

          {viewMode === 'summary' ? (
            sheetOptions.length === 0 ? (
              <p className={`text-xs ${tc.textMuted}`}>No differences detected.</p>
            ) : (
              sheetOptions.map((sheet) => (
                <section
                  key={sheet.sheetName}
                  className={`rounded border px-2 py-2 ${tc.border}`}
                >
                  <h3 className={`text-xs font-semibold ${tc.textBright}`}>
                    {sheet.sheetName}
                    {sheet.sheetAdded ? ' (added)' : ''}
                    {sheet.sheetRemoved ? ' (removed)' : ''}
                  </h3>
                  <ul className={`mt-1 space-y-0.5 text-[10px] ${tc.text}`}>
                    {sheet.components.map((c, i) => (
                      <li key={`c-${i}`}>
                        <span className="font-mono text-[9px] uppercase text-slate-400">
                          {c.change}
                        </span>{' '}
                        {c.label} ({c.componentType})
                        {c.detail ? ` — ${c.detail}` : ''}
                      </li>
                    ))}
                    {sheet.wires.map((w, i) => (
                      <li key={`w-${i}`}>
                        <span className="font-mono text-[9px] uppercase text-slate-400">
                          {w.change}
                        </span>{' '}
                        wire {w.wireKey}
                        {w.detail ? ` — ${w.detail}` : ''}
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )
          ) : null}
        </div>

        <div
          className={`flex justify-end gap-2 border-t px-4 py-3 ${tc.border}`}
        >
          <button
            type="button"
            className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs ${tc.textMuted} ${tc.itemHover}`}
            onClick={() =>
              downloadSnapshotDiffReport(diff, revisionLabel, 'revision-compare')
            }
          >
            <FiDownload size={12} />
            Export summary
          </button>
          <button
            type="button"
            className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div className="rounded border border-white/10 bg-black/20 px-2 py-1.5">
    <div className="text-[9px] uppercase tracking-wide text-slate-400">{label}</div>
    <div className={`text-sm font-semibold ${color}`}>{value}</div>
  </div>
);

export default SnapshotDiffDialog;
