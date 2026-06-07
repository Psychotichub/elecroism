import React from 'react';
import { FiEye, FiEyeOff, FiLock, FiUnlock } from 'react-icons/fi';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { useDrawingLayerStore } from '../../store/drawingLayerStore';
import type { DrawingLayerId } from '../../types';
import { DRAWING_LAYER_ORDER } from '../../utils/drawingLayers';

const DrawingLayersPanel: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const layers = useDrawingLayerStore((s) => s.layers);
  const activeLayer = useDrawingLayerStore((s) => s.activeLayer);
  const selectActiveLayerOnly = useDrawingLayerStore(
    (s) => s.selectActiveLayerOnly
  );
  const setActiveLayer = useDrawingLayerStore((s) => s.setActiveLayer);
  const setSelectActiveLayerOnly = useDrawingLayerStore(
    (s) => s.setSelectActiveLayerOnly
  );
  const setLayerVisible = useDrawingLayerStore((s) => s.setLayerVisible);
  const setLayerLocked = useDrawingLayerStore((s) => s.setLayerLocked);
  const setLayerColorWash = useDrawingLayerStore((s) => s.setLayerColorWash);
  const setLayerExportInclude = useDrawingLayerStore(
    (s) => s.setLayerExportInclude
  );
  const resetLayers = useDrawingLayerStore((s) => s.resetLayers);

  const ordered = DRAWING_LAYER_ORDER.map(
    (id) => layers.find((l) => l.id === id)!
  );

  return (
    <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${tc.text}`}>
      <div className={`border-b px-3 py-2 ${tc.border}`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className={`text-xs font-semibold ${tc.textBright}`}>
            Drawing layers
          </h2>
          <button
            type="button"
            className={`text-[10px] ${tc.textMuted} ${tc.itemHover} rounded px-2 py-0.5`}
            onClick={resetLayers}
          >
            Reset
          </button>
        </div>
        <p className={`mt-1 text-[10px] ${tc.textMuted}`}>
          Toggle visibility, lock editing, color wash, and PDF export per layer.
        </p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        <label
          className={`flex items-center gap-2 rounded border px-2 py-1.5 text-[11px] ${tc.border}`}
        >
          <input
            type="checkbox"
            checked={selectActiveLayerOnly}
            onChange={(e) => setSelectActiveLayerOnly(e.target.checked)}
          />
          Select on active layer only
        </label>

        {ordered.map((layer) => (
          <LayerRow
            key={layer.id}
            layerId={layer.id}
            label={layer.label}
            active={activeLayer === layer.id}
            visible={layer.visible}
            locked={layer.locked}
            colorWash={layer.colorWash}
            exportInclude={layer.exportInclude}
            washColor={layer.washColor}
            tc={tc}
            onActivate={() => setActiveLayer(layer.id)}
            onToggleVisible={() => setLayerVisible(layer.id, !layer.visible)}
            onToggleLocked={() => setLayerLocked(layer.id, !layer.locked)}
            onToggleWash={() => setLayerColorWash(layer.id, !layer.colorWash)}
            onToggleExport={() =>
              setLayerExportInclude(layer.id, !layer.exportInclude)
            }
          />
        ))}
      </div>
    </div>
  );
};

type LayerRowProps = {
  layerId: DrawingLayerId;
  label: string;
  active: boolean;
  visible: boolean;
  locked: boolean;
  colorWash: boolean;
  exportInclude: boolean;
  washColor: string;
  tc: (typeof themeColors)['dark'];
  onActivate: () => void;
  onToggleVisible: () => void;
  onToggleLocked: () => void;
  onToggleWash: () => void;
  onToggleExport: () => void;
};

const LayerRow: React.FC<LayerRowProps> = ({
  label,
  active,
  visible,
  locked,
  colorWash,
  exportInclude,
  washColor,
  tc,
  onActivate,
  onToggleVisible,
  onToggleLocked,
  onToggleWash,
  onToggleExport,
}) => (
  <div
    className={`rounded border px-2 py-2 ${tc.border} ${
      active ? 'ring-1 ring-blue-500/60' : ''
    }`}
  >
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onActivate}
        className={`text-left text-xs font-medium ${tc.textBright} ${tc.itemHover} rounded px-1`}
      >
        {label}
        {active ? (
          <span className={`ml-1 text-[10px] ${tc.textMuted}`}>(active)</span>
        ) : null}
      </button>
      <div className="flex items-center gap-1">
        <IconBtn
          label={visible ? 'Hide layer' : 'Show layer'}
          onClick={onToggleVisible}
          tc={tc}
        >
          {visible ? <FiEye size={14} /> : <FiEyeOff size={14} />}
        </IconBtn>
        <IconBtn
          label={locked ? 'Unlock layer' : 'Lock layer'}
          onClick={onToggleLocked}
          tc={tc}
        >
          {locked ? <FiLock size={14} /> : <FiUnlock size={14} />}
        </IconBtn>
      </div>
    </div>

    <div className={`mt-2 flex flex-wrap gap-3 text-[10px] ${tc.textMuted}`}>
      <label className="flex items-center gap-1.5">
        <input type="checkbox" checked={colorWash} onChange={onToggleWash} />
        <span
          className="inline-block h-3 w-3 rounded-sm border border-black/10"
          style={{ background: washColor }}
        />
        Color wash
      </label>
      <label className="flex items-center gap-1.5">
        <input type="checkbox" checked={exportInclude} onChange={onToggleExport} />
        Include in PDF
      </label>
    </div>
  </div>
);

const IconBtn: React.FC<{
  label: string;
  onClick: () => void;
  tc: (typeof themeColors)['dark'];
  children: React.ReactNode;
}> = ({ label, onClick, tc, children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className={`rounded p-1 ${tc.textMuted} ${tc.itemHover}`}
  >
    {children}
  </button>
);

export default DrawingLayersPanel;
