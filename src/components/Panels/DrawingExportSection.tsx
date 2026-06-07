import React, { useCallback, useState } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';

const DrawingExportSection: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const circuit = useCircuitStore((s) => s.circuit);
  const setDrawingMetadata = useCircuitStore((s) => s.setDrawingMetadata);
  const addDrawingSheet = useCircuitStore((s) => s.addDrawingSheet);
  const addDrawingSheetFromSelection = useCircuitStore(
    (s) => s.addDrawingSheetFromSelection
  );
  const updateDrawingSheet = useCircuitStore((s) => s.updateDrawingSheet);
  const removeDrawingSheet = useCircuitStore((s) => s.removeDrawingSheet);
  const exportDrawingPdf = useCircuitStore((s) => s.exportDrawingPdf);

  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const sheets = circuit.drawingSheets ?? [];

  const handleExportPdf = useCallback(async () => {
    setExportMsg(null);
    const err = await exportDrawingPdf();
    if (err) setExportMsg(err);
    else setExportMsg('PDF downloaded.');
  }, [exportDrawingPdf]);

  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder?: string
  ) => (
    <div className="mb-2">
      <label htmlFor={id} className={`mb-0.5 block text-[10px] ${tc.textMuted}`}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field w-full py-1 text-xs"
      />
    </div>
  );

  return (
    <div className={`rounded-md border p-2 ${tc.border}`}>
      <h3
        className={`mb-1.5 text-[11px] font-bold uppercase tracking-wide ${tc.textMuted}`}
      >
        Drawing export (PDF)
      </h3>
      <p className={`mb-2 text-[10px] leading-snug ${tc.textMuted}`}>
        Title block fields populate every exported page. Add multiple sheets for
        a sheet index and per-page crops (from selection or full drawing).
      </p>

      {field(
        'drawing-name',
        'Drawing / circuit name',
        circuit.name,
        (v) => setDrawingMetadata({ name: v }),
        'MCC-01 Schematic'
      )}
      {field(
        'drawing-project',
        'Project',
        circuit.drawingProject ?? '',
        (v) => setDrawingMetadata({ drawingProject: v }),
        'Client / site name'
      )}
      {field(
        'drawing-number',
        'Drawing number',
        circuit.drawingNumber ?? '',
        (v) => setDrawingMetadata({ drawingNumber: v }),
        'EL-001'
      )}
      {field(
        'drawing-rev',
        'Revision',
        circuit.drawingRevision ?? '',
        (v) => setDrawingMetadata({ drawingRevision: v }),
        'A'
      )}
      {field(
        'drawn-by',
        'Drawn by',
        circuit.drawnBy ?? '',
        (v) => setDrawingMetadata({ drawnBy: v })
      )}
      {field(
        'checked-by',
        'Checked by',
        circuit.checkedBy ?? '',
        (v) => setDrawingMetadata({ checkedBy: v })
      )}

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
              reference: circuit.drawingNumber?.trim() || '=S1',
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
      </div>
      {exportMsg ? (
        <p className={`mt-2 text-[10px] ${tc.textMuted}`}>{exportMsg}</p>
      ) : null}
    </div>
  );
};

export default DrawingExportSection;
