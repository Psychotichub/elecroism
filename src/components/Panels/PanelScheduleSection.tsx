import React, { useCallback, useMemo, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { buildPanelScheduleRows } from '../../utils/panelScheduleExport';

const PanelScheduleSection: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const circuit = useCircuitStore((s) => s.circuit);
  const project = useCircuitStore((s) => s.project);
  const exportPanelScheduleCsv = useCircuitStore((s) => s.exportPanelScheduleCsv);
  const exportPanelSchedulePdf = useCircuitStore((s) => s.exportPanelSchedulePdf);

  const [msg, setMsg] = useState<string | null>(null);

  const rows = useMemo(() => buildPanelScheduleRows(circuit), [circuit]);

  const handleCsv = useCallback(() => {
    setMsg(null);
    exportPanelScheduleCsv();
    setMsg('Panel schedule CSV downloaded.');
  }, [exportPanelScheduleCsv]);

  const handlePdf = useCallback(() => {
    setMsg(null);
    const err = exportPanelSchedulePdf();
    if (err) setMsg(err);
    else setMsg('Panel schedule PDF downloaded.');
  }, [exportPanelSchedulePdf]);

  return (
    <div className={`rounded-md border p-2 ${tc.border}`}>
      <h3
        className={`mb-1.5 text-[11px] font-bold uppercase tracking-wide ${tc.textMuted}`}
      >
        Panel / MCC schedule
      </h3>
      <p className={`mb-2 text-[10px] leading-snug ${tc.textMuted}`}>
        Auto lineup from placed breakers, contactors, fuses, and meters (left-to-right
        by canvas position). Columns: tag, type, rating, cable ref, notes.
      </p>
      <p className={`mb-2 text-[10px] ${tc.text}`}>
        {rows.length === 0
          ? 'No lineup devices on this sheet.'
          : `${rows.length} device${rows.length === 1 ? '' : 's'} · ${project.name}`}
      </p>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={handleCsv}
          className="inline-flex items-center gap-1 rounded bg-slate-600 px-2 py-1 text-[10px] text-white hover:bg-slate-500"
        >
          <FiDownload size={10} />
          CSV
        </button>
        <button
          type="button"
          onClick={handlePdf}
          className="inline-flex items-center gap-1 rounded bg-indigo-700 px-2 py-1 text-[10px] text-white hover:bg-indigo-600"
        >
          <FiDownload size={10} />
          PDF
        </button>
      </div>
      {msg ? <p className={`mt-2 text-[10px] ${tc.textMuted}`}>{msg}</p> : null}
    </div>
  );
};

export default PanelScheduleSection;
