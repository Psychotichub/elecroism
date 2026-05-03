import React from 'react';
import { usePPCtx } from '../PropertyPanelContext';
import { Label } from '../PropertyPanelLabel';
import { WIRE_COLORS, CROSS_SECTIONS } from '../constants';
import {
  WIRE_STYLE_LAYER_OPTIONS,
  applyWireStyleLayerDefaults,
  suggestedCrossSectionForLayer,
} from '../../../../utils/wireStyleLayers';
import type { WireStyleLayer } from '../../../../types';
import { nextWireNumber } from '../../../../utils/wireLabelLayout';
import {
  WIRE_PANEL_DESCRIPTION,
  formatComponentPanelHelpText,
} from '../../../../utils/componentPanelInfo';
import { getWireColor } from '../../../../utils/geometry';
import { useCircuitStore } from '../../../../store/circuitStore';

export const WirePropsContent: React.FC = () => {
  const { selectedWire, tc, theme, updateWire, circuit } = usePPCtx();
  if (!selectedWire) return null;

  const wi = WIRE_PANEL_DESCRIPTION;
  return (
    <>
      <div
        className={`rounded-md border p-2.5 space-y-2 ${tc.border} ${theme === 'dark' ? 'bg-black/25' : 'bg-gray-50'}`}
        aria-label={formatComponentPanelHelpText(wi)}
      >
        <h3 className={`text-xs font-semibold ${tc.textBright}`}>
          {wi.displayName}
        </h3>
        <p className={`text-[11px] leading-snug ${tc.text}`}>{wi.description}</p>
        <div>
          <p
            className={`text-[10px] uppercase tracking-wide ${tc.textMuted} mb-1`}
          >
            Features
          </p>
          <ul
            className={`text-[11px] leading-snug list-disc list-inside space-y-0.5 ${tc.text}`}
          >
            {wi.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
        <div>
          <p
            className={`text-[10px] uppercase tracking-wide ${tc.textMuted} mb-0.5`}
          >
            Purpose
          </p>
          <p className={`text-[11px] leading-snug ${tc.text}`}>{wi.purpose}</p>
        </div>
      </div>
      <Label text="Style layer (preset look)">
        <select
          className="input-field w-full text-xs"
          value={selectedWire.styleLayer ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) {
              updateWire(selectedWire.id, { styleLayer: undefined });
              return;
            }
            updateWire(selectedWire.id, {
              ...applyWireStyleLayerDefaults(v as WireStyleLayer),
            });
          }}
        >
          <option value="">— Conductor color only —</option>
          {WIRE_STYLE_LAYER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
              {suggestedCrossSectionForLayer(o.value) != null
                ? ` (~${suggestedCrossSectionForLayer(o.value)} mm²)`
                : ''}
            </option>
          ))}
        </select>
        <p className={`text-[10px] mt-1 ${tc.textMuted}`}>
          Sets stroke, dash, and conductor metadata to match the layer. Clear
          to use only the color swatches below.
        </p>
      </Label>
      <Label text="Wire Color">
        <div className="space-y-1.5">
          {WIRE_COLORS.map((wc) => (
            <button
              key={wc.value}
              type="button"
              onClick={() =>
                updateWire(selectedWire.id, { color: wc.value })
              }
              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-colors ${
                selectedWire.color === wc.value
                  ? 'ring-2 ring-blue-500 bg-blue-600/20'
                  : `${tc.btnBg} ${tc.btnHover}`
              }`}
            >
              <span
                className="w-4 h-4 rounded-sm border border-gray-500 inline-block"
                style={{ backgroundColor: getWireColor(wc.value) }}
              />
              <span className={tc.text}>{wc.label}</span>
            </button>
          ))}
        </div>
      </Label>
      <Label text="Cross Section (mm²)">
        <select
          value={selectedWire.crossSection}
          onChange={(e) =>
            updateWire(selectedWire.id, {
              crossSection: Number(e.target.value),
            })
          }
          className="input-field"
        >
          {(() => {
            const opts = new Set<number>([...CROSS_SECTIONS]);
            opts.add(selectedWire.crossSection);
            return Array.from(opts).sort((a, b) => a - b);
          })().map((cs) => (
            <option key={cs} value={cs}>
              {cs} mm²
            </option>
          ))}
        </select>
        <p className={`text-[10px] mt-1 ${tc.textMuted} leading-snug`}>
          Ladder from <strong>0.5</strong> to <strong>240</strong> mm² (typical
          panel control: flexible Cu such as H07V-K at about 0.5–1.5 mm²).
          Values drive line weight and rough Cu ampacity hints in validation.
        </p>
      </Label>
      <Label text="Wire ID (designator)">
        <label
          className={`flex items-center gap-2 text-xs cursor-pointer mb-1.5 ${tc.text}`}
        >
          <input
            type="checkbox"
            className="rounded border-gray-500"
            checked={selectedWire.wireNumberAuto === true}
            onChange={(e) =>
              updateWire(selectedWire.id, {
                wireNumberAuto: e.target.checked,
              })
            }
          />
          Auto from components (From.Term-To.Term)
        </label>
        <p className={`text-[10px] leading-snug ${tc.textMuted} mb-1.5`}>
          Example: device labels Q0 and Q1 with terminals L1 become{' '}
          <span className="font-mono">Q0.L1-Q1.L1</span>. Rename a device and
          this updates while auto is on. Turn off to type a fixed ID.
        </p>
        <div className="flex gap-1.5">
          <input
            type="text"
            className="input-field flex-1 font-mono text-xs"
            value={selectedWire.wireNumber ?? ''}
            onChange={(e) =>
              updateWire(selectedWire.id, {
                wireNumber: e.target.value || undefined,
              })
            }
            placeholder="W1 or Q0.L1-Q1.L1"
            disabled={selectedWire.wireNumberAuto === true}
          />
          <button
            type="button"
            className={`shrink-0 px-2 py-1 rounded text-[10px] font-medium ${tc.btnBg} ${tc.btnHover} ${tc.text}`}
            onClick={() => {
              updateWire(selectedWire.id, {
                wireNumber: nextWireNumber({
                  ...circuit,
                  wires: circuit.wires.filter((w) => w.id !== selectedWire.id),
                }),
                wireNumberAuto: false,
              });
            }}
          >
            Next #
          </button>
        </div>
      </Label>
      <Label text="Label (on drawing)">
        <input
          type="text"
          className="input-field w-full text-xs"
          value={selectedWire.wireLabel ?? ''}
          onChange={(e) =>
            updateWire(selectedWire.id, {
              wireLabel: e.target.value.trim()
                ? e.target.value
                : undefined,
            })
          }
          placeholder="Overrides Wire ID when set"
        />
      </Label>
      <label
        className={`flex items-center gap-2 text-xs cursor-pointer ${tc.text}`}
      >
        <input
          type="checkbox"
          className="rounded border-gray-500"
          checked={selectedWire.labelVisible !== false}
          onChange={(e) =>
            updateWire(selectedWire.id, {
              labelVisible: e.target.checked ? undefined : false,
            })
          }
        />
        Show label on canvas
      </label>
      <Label text="Source tag">
        <input
          type="text"
          className="input-field w-full text-xs"
          value={selectedWire.sourceTag ?? ''}
          onChange={(e) =>
            updateWire(selectedWire.id, {
              sourceTag: e.target.value.trim() || undefined,
            })
          }
          placeholder="Optional (schedule / docs)"
        />
      </Label>
      <Label text="Destination tag">
        <input
          type="text"
          className="input-field w-full text-xs"
          value={selectedWire.destinationTag ?? ''}
          onChange={(e) =>
            updateWire(selectedWire.id, {
              destinationTag: e.target.value.trim() || undefined,
            })
          }
          placeholder="Optional"
        />
      </Label>
      <Label text="Energized">
        <span
          className={`text-xs font-medium ${
            selectedWire.energized ? 'text-green-400' : tc.textMuted
          }`}
        >
          {selectedWire.energized ? 'YES' : 'NO'}
        </span>
      </Label>
      <Label text="Current">
        <span className={`text-xs ${tc.text}`}>
          {selectedWire.currentAmps.toFixed(2)}A
        </span>
      </Label>
      <button
        type="button"
        onClick={() => {
          const msg = useCircuitStore
            .getState()
            .normalizeWireRoute(selectedWire.id);
          if (msg) window.alert(msg);
        }}
        className={`w-full px-3 py-2 rounded text-xs font-medium mt-2 ${tc.btnBg} ${tc.btnHover} ${tc.text}`}
      >
        Normalize route
      </button>
      <p className={`text-[10px] ${tc.textMuted} -mt-1`}>
        Dedupe vertices, straighten near-axis jogs, merge collinear bends
        {circuit.gridSize > 0 ? '; grid-align when wire grid snap is on' : ''}.
        Cmd: <span className="font-mono">normalize</span>
      </p>
      <button
        type="button"
        onClick={() => useCircuitStore.getState().removeWire(selectedWire.id)}
        className="w-full px-3 py-2 bg-red-700 text-white rounded text-xs font-medium hover:bg-red-600 mt-2"
      >
        Delete Wire
      </button>
    </>
  );
};
