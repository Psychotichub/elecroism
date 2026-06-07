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
import PropertySection from '../PropertySection';
import { getWireColor } from '../../../../utils/geometry';
import { useCircuitStore } from '../../../../store/circuitStore';
import { wireLengthMeters } from '../../../../simulation/cableImpedance';
import { DrawingLayerField } from '../DrawingLayerField';
import type { DrawingLayerId } from '../../../../types';

export const WirePropsContent: React.FC = () => {
  const { selectedWire, tc, updateWire, circuit } = usePPCtx();
  if (!selectedWire) return null;

  return (
    <>
      <PropertySection title="Documentation" defaultOpen>
        <DrawingLayerField
          wire={selectedWire}
          tc={tc}
          onChange={(layer: DrawingLayerId) =>
            updateWire(selectedWire.id, { drawingLayer: layer })
          }
        />
        <Label text="Wire ID (designator)">
          <label
            className={`flex items-center gap-2 es-typo-body cursor-pointer mb-1.5 ${tc.text}`}
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
          <div className="flex gap-1.5">
            <input
              type="text"
              className="input-field flex-1 font-mono es-typo-body"
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
              className={`shrink-0 px-2 py-1 rounded es-typo-caption font-medium ${tc.btnBg} ${tc.btnHover} ${tc.text}`}
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
            className="input-field w-full es-typo-body"
            value={selectedWire.wireLabel ?? ''}
            onChange={(e) =>
              updateWire(selectedWire.id, {
                wireLabel: e.target.value.trim() ? e.target.value : undefined,
              })
            }
            placeholder="Overrides Wire ID when set"
          />
        </Label>
        <label
          className={`flex items-center gap-2 es-typo-body cursor-pointer ${tc.text}`}
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
            className="input-field w-full es-typo-body"
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
            className="input-field w-full es-typo-body"
            value={selectedWire.destinationTag ?? ''}
            onChange={(e) =>
              updateWire(selectedWire.id, {
                destinationTag: e.target.value.trim() || undefined,
              })
            }
            placeholder="Optional"
          />
        </Label>
      </PropertySection>

      <PropertySection title="Electrical" defaultOpen>
        <Label text="Style layer (preset look)">
          <select
            className="input-field w-full es-typo-body"
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
            <option value="">Conductor color only</option>
            {WIRE_STYLE_LAYER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
                {suggestedCrossSectionForLayer(o.value) != null
                  ? ` (~${suggestedCrossSectionForLayer(o.value)} mm2)`
                  : ''}
              </option>
            ))}
          </select>
        </Label>
        <Label text="Wire Color">
          <div className="space-y-1.5">
            {WIRE_COLORS.map((wc) => (
              <button
                key={wc.value}
                type="button"
                onClick={() => updateWire(selectedWire.id, { color: wc.value })}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded es-typo-body transition-colors ${
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
        <Label text="Cross Section (mm2)">
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
                {cs} mm2
              </option>
            ))}
          </select>
          {(() => {
            const lenM = wireLengthMeters(selectedWire.points, circuit.gridSize);
            const drop = selectedWire.voltageDropV ?? 0;
            if (lenM <= 0 && drop <= 0) return null;
            return (
              <p className={`es-typo-caption mt-1 ${tc.textMuted} leading-snug`}>
                {lenM > 0 ? (
                  <>
                    Run length ~ <strong>{lenM.toFixed(1)} m</strong>
                    {drop > 0 ? ' � ' : ''}
                  </>
                ) : null}
                {drop > 0 ? (
                  <>
                    load-flow drop ~ <strong>{drop.toFixed(2)} V</strong>
                  </>
                ) : null}
              </p>
            );
          })()}
        </Label>
        <Label text="Current">
          <span className={`es-typo-body es-tabular-nums ${tc.text}`}>
            {selectedWire.currentAmps.toFixed(2)}A
          </span>
        </Label>
      </PropertySection>

      <PropertySection title="Mechanical">
        <button
          type="button"
          onClick={() => {
            const msg = useCircuitStore
              .getState()
              .normalizeWireRoute(selectedWire.id);
            if (msg) window.alert(msg);
          }}
          className={`w-full px-3 py-2 rounded es-typo-body font-medium ${tc.btnBg} ${tc.btnHover} ${tc.text}`}
        >
          Normalize route
        </button>
        <button
          type="button"
          onClick={() => {
            const msg = useCircuitStore
              .getState()
              .autoRerouteWire(selectedWire.id);
            if (msg) window.alert(msg);
          }}
          className={`w-full px-3 py-2 rounded es-typo-body font-medium mt-1 ${tc.btnBg} ${tc.btnHover} ${tc.text}`}
        >
          Auto-reroute (avoid obstacles)
        </button>
        <button
          type="button"
          onClick={() => {
            const ok = useCircuitStore
              .getState()
              .bundleParallelWires(selectedWire.id);
            if (!ok) window.alert('No parallel bundle found for this wire');
          }}
          className="w-full px-3 py-2 rounded es-typo-body font-medium mt-1 bg-slate-700 text-white hover:bg-slate-600"
        >
          Space parallel bundle
        </button>
        <button
          type="button"
          onClick={() => useCircuitStore.getState().removeWire(selectedWire.id)}
          className="w-full px-3 py-2 bg-red-700 text-white rounded es-typo-body font-medium hover:bg-red-600 mt-2"
        >
          Delete Wire
        </button>
      </PropertySection>
    </>
  );
};
