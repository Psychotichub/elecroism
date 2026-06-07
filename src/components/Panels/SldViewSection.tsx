import React, { useCallback, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { useCircuitStore } from '../../store/circuitStore';
import { useUiStore } from '../../store/uiStore';
import { useThemeStore, themeColors } from '../../store/themeStore';

const SldViewSection: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const sldViewMode = useUiStore((s) => s.sldViewMode);
  const toggleSldViewMode = useUiStore((s) => s.toggleSldViewMode);
  const exportSldPdf = useCircuitStore((s) => s.exportSldPdf);
  const [msg, setMsg] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setMsg(null);
    const err = await exportSldPdf();
    if (err) setMsg(err);
    else setMsg('SLD PDF downloaded.');
  }, [exportSldPdf]);

  return (
    <div className={`rounded-md border p-2 ${tc.border}`}>
      <h3
        className={`mb-1.5 text-[11px] font-bold uppercase tracking-wide ${tc.textMuted}`}
      >
        Single-line diagram (SLD)
      </h3>
      <p className={`mb-2 text-[10px] leading-snug ${tc.textMuted}`}>
        Simplified view: devices collapse to blocks, wires render as straight
        segments (no bend grips). Toggle off to return to the detailed schematic
        — circuit data is unchanged.
      </p>
      <label className={`mb-2 flex items-center gap-2 text-[11px] ${tc.text}`}>
        <input
          type="checkbox"
          checked={sldViewMode}
          onChange={() => toggleSldViewMode()}
        />
        SLD view on canvas
      </label>
      <button
        type="button"
        onClick={() => void handleExport()}
        className="inline-flex items-center gap-1 rounded bg-indigo-700 px-2 py-1 text-[10px] text-white hover:bg-indigo-600"
      >
        <FiDownload size={10} />
        Export SLD PDF
      </button>
      {msg ? <p className={`mt-2 text-[10px] ${tc.textMuted}`}>{msg}</p> : null}
    </div>
  );
};

export default SldViewSection;
