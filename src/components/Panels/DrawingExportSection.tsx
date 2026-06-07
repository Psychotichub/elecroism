import React, { useCallback, useState } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useUiStore } from '../../store/uiStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { resolvedProjectTitleBlock } from '../../utils/projectTitleBlock';

const DrawingExportSection: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const circuit = useCircuitStore((s) => s.circuit);
  const project = useCircuitStore((s) => s.project);
  const setDrawingMetadata = useCircuitStore((s) => s.setDrawingMetadata);
  const addDrawingSheet = useCircuitStore((s) => s.addDrawingSheet);
  const addDrawingSheetFromSelection = useCircuitStore(
    (s) => s.addDrawingSheetFromSelection
  );
  const updateDrawingSheet = useCircuitStore((s) => s.updateDrawingSheet);
  const removeDrawingSheet = useCircuitStore((s) => s.removeDrawingSheet);
  const exportDrawingPdf = useCircuitStore((s) => s.exportDrawingPdf);
  const exportDocumentationPack = useCircuitStore((s) => s.exportDocumentationPack);
  const setProjectSettingsOpen = useUiStore((s) => s.setProjectSettingsOpen);

  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const sheets = circuit.drawingSheets ?? [];
  const titleBlock = resolvedProjectTitleBlock(project, circuit);

  const handleExportPdf = useCallback(async () => {
    setExportMsg(null);
    const err = await exportDrawingPdf();
    if (err) setExportMsg(err);
    else setExportMsg('PDF downloaded.');
  }, [exportDrawingPdf]);

  const handleExportPack = useCallback(async () => {
    setExportMsg(null);
    const err = await exportDocumentationPack();
    if (err) setExportMsg(err);
    else setExportMsg('Documentation pack ZIP downloaded.');
  }, [exportDocumentationPack]);

  return (
    <div className={`rounded-md border p-2 ${tc.border}`}>
      <h3
        className={`mb-1.5 text-[11px] font-bold uppercase tracking-wide ${tc.textMuted}`}
      >
        Drawing export (PDF)
      </h3>
      <p className={`mb-2 text-[10px] leading-snug ${tc.textMuted}`}>
        Title block and revision history are set in project settings and apply
        to every sheet. Add multiple export sheets for a sheet index and
        per-page crops. Export a full client documentation pack (ZIP) with
        drawing PDF, schedules, coordination report, and README manifest.
      </p>

      <div className={`mb-2 rounded border p-2 ${tc.border}`}>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className={`text-[10px] font-semibold ${tc.textMuted}`}>
            Title block (project-wide)
          </span>
          <button
            type="button"
            onClick={() => setProjectSettingsOpen(true)}
            className="rounded bg-indigo-700 px-2 py-0.5 text-[10px] text-white hover:bg-indigo-600"
          >
            Edit…
          </button>
        </div>
        <dl className={`grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] ${tc.textMuted}`}>
          <div>
            <dt className="inline font-semibold">Client: </dt>
            <dd className="inline">{titleBlock.client || '—'}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Drawing: </dt>
            <dd className="inline">{titleBlock.drawingNumber || '—'}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Rev: </dt>
            <dd className="inline">{titleBlock.revision || '—'}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Scale: </dt>
            <dd className="inline">{titleBlock.scale || 'NTS'}</dd>
          </div>
        </dl>
        {(titleBlock.revisionHistory?.length ?? 0) > 0 ? (
          <p className={`mt-1 text-[10px] ${tc.textMuted}`}>
            {titleBlock.revisionHistory!.length} revision record
            {titleBlock.revisionHistory!.length === 1 ? '' : 's'} (last four on
            PDF).
          </p>
        ) : null}
      </div>

      <div className="mb-2">
        <label
          htmlFor="drawing-name"
          className={`mb-0.5 block text-[10px] ${tc.textMuted}`}
        >
          Active sheet name (export title)
        </label>
        <input
          id="drawing-name"
          type="text"
          value={circuit.name}
          onChange={(e) => setDrawingMetadata({ name: e.target.value })}
          placeholder="MCC-01 Schematic"
          className="input-field w-full py-1 text-xs"
        />
      </div>

      <div className="mb-2">
        <span className={`text-[10px] font-semibold ${tc.textMuted}`}>
          Sheets ({sheets.length || 1} exported)
        </span>
        {sheets.length === 0 ? (
          <p className={`mt-1 text-[10px] ${tc.textMuted}`}>
            No custom sheets — export uses one full-drawing page.
          </p>
        ) : (
          <ul className="mt-1 space-y-2">
            {sheets.map((sheet) => (
              <li
                key={sheet.id}
                className={`rounded border p-1.5 ${tc.border}`}
              >
                <div className="flex flex-wrap gap-1">
                  <input
                    type="number"
                    min={1}
                    value={sheet.sheetNumber}
                    onChange={(e) =>
                      updateDrawingSheet(sheet.id, {
                        sheetNumber: Number(e.target.value) || 1,
                      })
                    }
                    className="input-field w-12 py-0.5 text-[10px]"
                    title="Sheet number"
                  />
                  <input
                    type="text"
                    value={sheet.title}
                    onChange={(e) =>
                      updateDrawingSheet(sheet.id, { title: e.target.value })
                    }
                    className="input-field min-w-0 flex-1 py-0.5 text-[10px]"
                    placeholder="Sheet title"
                  />
                  <input
                    type="text"
                    value={sheet.reference}
                    onChange={(e) =>
                      updateDrawingSheet(sheet.id, {
                        reference: e.target.value,
                      })
                    }
                    className="input-field w-16 py-0.5 text-[10px]"
                    placeholder="=S1"
                  />
                  <button
                    type="button"
                    onClick={() => removeDrawingSheet(sheet.id)}
                    className="rounded bg-red-800/80 px-1.5 py-0.5 text-[10px] text-white hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() =>
            addDrawingSheet({
              title: circuit.name || 'Schematic',
              reference: titleBlock.drawingNumber?.trim() || '=S1',
            })
          }
          className="rounded bg-slate-600 px-2 py-1 text-[10px] text-white hover:bg-slate-500"
        >
          Add full sheet
        </button>
        <button
          type="button"
          onClick={() => {
            if (!addDrawingSheetFromSelection()) {
              setExportMsg('Select components first to define a sheet crop.');
            }
          }}
          className="rounded bg-slate-600 px-2 py-1 text-[10px] text-white hover:bg-slate-500"
        >
          Add sheet from selection
        </button>
        <button
          type="button"
          onClick={() => void handleExportPdf()}
          className="rounded bg-indigo-700 px-2 py-1 text-[10px] text-white hover:bg-indigo-600"
        >
          Export PDF
        </button>
        <button
          type="button"
          onClick={() => void handleExportPack()}
          className="rounded bg-emerald-800 px-2 py-1 text-[10px] text-white hover:bg-emerald-700"
        >
          Documentation pack
        </button>
      </div>
      {exportMsg ? (
        <p className={`mt-2 text-[10px] ${tc.textMuted}`}>{exportMsg}</p>
      ) : null}
    </div>
  );
};

export default DrawingExportSection;
