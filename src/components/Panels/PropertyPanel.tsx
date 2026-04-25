import React from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import type { ComponentProperties, WireColor } from '../../types';
import { getWireColor } from '../../utils/geometry';

const WIRE_COLORS: { value: WireColor; label: string }[] = [
  { value: 'brown', label: 'Brown (L)' },
  { value: 'blue', label: 'Blue (N)' },
  { value: 'green_yellow', label: 'Green-Yellow (PE)' },
  { value: 'black', label: 'Black' },
  { value: 'grey', label: 'Grey' },
  { value: 'red', label: 'Red' },
];

const CROSS_SECTIONS = [1.5, 2.5, 4, 6, 10];

const PropertyPanel: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];

  const {
    circuit,
    selectedId,
    simulationResult,
    updateComponent,
    updateWire,
    toggleComponent,
    resetTripped,
    removeComponent,
    rotateComponent,
    duplicateComponent,
  } = useCircuitStore();

  const selectedComp = circuit.components.find(
    (c) => c.id === selectedId
  );
  const selectedWire = circuit.wires.find((w) => w.id === selectedId);
  const nodeResult = selectedComp
    ? simulationResult?.nodes[selectedComp.id]
    : null;

  if (!selectedComp && !selectedWire) {
    return (
      <div className={`w-72 ${tc.panel} ${tc.text} p-4 flex flex-col items-center justify-center border-l ${tc.border}`}>
        <p className={`text-sm ${tc.textMuted}`}>Select a component</p>
      </div>
    );
  }

  const updateProp = (updates: Partial<ComponentProperties>) => {
    if (!selectedComp) return;
    updateComponent(selectedComp.id, {
      properties: { ...selectedComp.properties, ...updates },
    });
  };

  const renderSwitchProps = () => (
    <>
      <Label text="Type">
        <select
          value={selectedComp!.properties.switchType || 'SPST'}
          onChange={(e) =>
            updateProp({
              switchType: e.target.value as ComponentProperties['switchType'],
            })
          }
          className="input-field"
        >
          <option value="SPST">SPST</option>
          <option value="SPDT">SPDT</option>
          <option value="DPST">DPST</option>
          <option value="DPDT">DPDT</option>
        </select>
      </Label>
      <Label text="State">
        <button
          onClick={() => toggleComponent(selectedComp!.id)}
          className={`px-3 py-1 rounded text-xs font-medium ${
            selectedComp!.state === 'on'
              ? 'bg-green-600 text-white'
              : 'bg-gray-600 text-gray-300'
          }`}
        >
          {selectedComp!.state === 'on' ? 'ON' : 'OFF'}
        </button>
      </Label>
    </>
  );

  const renderMCBProps = () => (
    <>
      <Label text="Rating">
        <select
          value={selectedComp!.properties.ratingAmps || 16}
          onChange={(e) =>
            updateProp({ ratingAmps: Number(e.target.value) })
          }
          className="input-field"
        >
          {[6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125].map(
            (a) => (
              <option key={a} value={a}>
                {a}A
              </option>
            )
          )}
        </select>
      </Label>
      <Label text="Poles">
        <div className="flex gap-1">
          {[1, 2, 3].map((p) => (
            <button
              key={p}
              onClick={() => updateProp({ poles: p })}
              className={`px-2 py-1 rounded text-xs ${
                selectedComp!.properties.poles === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {p}P
            </button>
          ))}
        </div>
      </Label>
      <Label text="Trip Curve">
        <div className="flex gap-1">
          {(['B', 'C', 'D'] as const).map((t) => (
            <button
              key={t}
              onClick={() => updateProp({ tripCurve: t })}
              className={`px-2 py-1 rounded text-xs ${
                selectedComp!.properties.tripCurve === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Label>
      <Label text="Breaking">
        <div className="flex gap-1">
          {([6000, 10000] as const).map((b) => (
            <button
              key={b}
              onClick={() => updateProp({ breakingCapacity: b })}
              className={`px-2 py-1 rounded text-xs ${
                selectedComp!.properties.breakingCapacity === b
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {b / 1000}kA
            </button>
          ))}
        </div>
      </Label>
      {selectedComp!.state === 'tripped' && (
        <button
          onClick={() => resetTripped(selectedComp!.id)}
          className="w-full px-3 py-2 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
        >
          RESET MCB
        </button>
      )}
      <Label text="State">
        <span
          className={`text-xs font-medium ${
            selectedComp!.state === 'tripped'
              ? 'text-red-400'
              : selectedComp!.state === 'on'
              ? 'text-green-400'
              : 'text-gray-400'
          }`}
        >
          {selectedComp!.state.toUpperCase()}
        </span>
      </Label>
    </>
  );

  const renderRCDProps = () => (
    <>
      <Label text="Rating">
        <select
          value={selectedComp!.properties.ratingAmps || 40}
          onChange={(e) =>
            updateProp({ ratingAmps: Number(e.target.value) })
          }
          className="input-field"
        >
          {[25, 40, 63, 100].map((a) => (
            <option key={a} value={a}>
              {a}A
            </option>
          ))}
        </select>
      </Label>
      <Label text="Sensitivity">
        <select
          value={selectedComp!.properties.rcdSensitivity || 30}
          onChange={(e) =>
            updateProp({ rcdSensitivity: Number(e.target.value) as 10 | 30 | 100 | 300 })
          }
          className="input-field"
        >
          {[10, 30, 100, 300].map((s) => (
            <option key={s} value={s}>
              {s}mA
            </option>
          ))}
        </select>
      </Label>
      <Label text="Poles">
        <div className="flex gap-1">
          {[2, 4].map((p) => (
            <button
              key={p}
              onClick={() => updateProp({ poles: p })}
              className={`px-2 py-1 rounded text-xs ${
                selectedComp!.properties.poles === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {p}P
            </button>
          ))}
        </div>
      </Label>
      {selectedComp!.state === 'tripped' && (
        <button
          onClick={() => resetTripped(selectedComp!.id)}
          className="w-full px-3 py-2 bg-red-600 text-white rounded text-xs font-medium"
        >
          RESET RCD
        </button>
      )}
    </>
  );

  const renderLoadProps = () => (
    <>
      <Label text="Load Type">
        <select
          value={selectedComp!.properties.loadType || 'resistive'}
          onChange={(e) =>
            updateProp({
              loadType: e.target.value as ComponentProperties['loadType'],
            })
          }
          className="input-field"
        >
          <option value="resistive">Resistive</option>
          <option value="inductive">Inductive</option>
          <option value="capacitive">Capacitive</option>
        </select>
      </Label>
      <Label text="Power (W)">
        <input
          type="number"
          value={selectedComp!.properties.powerWatts || 0}
          onChange={(e) =>
            updateProp({ powerWatts: Number(e.target.value) })
          }
          className="input-field"
          min={0}
          max={50000}
        />
      </Label>
      <Label text="Power Factor">
        <input
          type="number"
          value={selectedComp!.properties.powerFactor ?? 1}
          onChange={(e) =>
            updateProp({
              powerFactor: Math.max(
                0,
                Math.min(1, Number(e.target.value))
              ),
            })
          }
          className="input-field"
          min={0}
          max={1}
          step={0.01}
        />
      </Label>
      <Label text="Voltage">
        <div className="flex gap-1">
          {[110, 230].map((v) => (
            <button
              key={v}
              onClick={() => updateProp({ voltage: v })}
              className={`px-2 py-1 rounded text-xs ${
                selectedComp!.properties.voltage === v
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {v}V
            </button>
          ))}
        </div>
      </Label>
    </>
  );

  const renderSocketProps = () => (
    <>
      <Label text="Type">
        <select
          value={selectedComp!.properties.socketType || 'schuko'}
          onChange={(e) =>
            updateProp({
              socketType: e.target.value as ComponentProperties['socketType'],
            })
          }
          className="input-field"
        >
          <option value="schuko">Schuko</option>
          <option value="UK">UK</option>
          <option value="US">US</option>
          <option value="IEC">IEC</option>
        </select>
      </Label>
      <Label text="Rating">
        <select
          value={selectedComp!.properties.ratingAmps || 16}
          onChange={(e) =>
            updateProp({ ratingAmps: Number(e.target.value) })
          }
          className="input-field"
        >
          {[13, 16, 20, 32].map((a) => (
            <option key={a} value={a}>
              {a}A
            </option>
          ))}
        </select>
      </Label>
      <Label text="Load Power (W)">
        <input
          type="number"
          value={selectedComp!.properties.powerWatts || 0}
          onChange={(e) =>
            updateProp({ powerWatts: Number(e.target.value) })
          }
          className="input-field"
          min={0}
        />
      </Label>
    </>
  );

  const renderPowerSourceProps = () => (
    <>
      <Label text="Voltage">
        <input
          type="number"
          value={selectedComp!.properties.voltage || 230}
          onChange={(e) =>
            updateProp({ voltage: Number(e.target.value) })
          }
          className="input-field"
          min={0}
        />
      </Label>
      <Label text="Phase">
        <select
          value={selectedComp!.properties.phaseSystem || 'single_phase'}
          onChange={(e) =>
            updateProp({
              phaseSystem: e.target.value as 'single_phase' | 'three_phase',
            })
          }
          className="input-field"
        >
          <option value="single_phase">Single Phase</option>
          <option value="three_phase">Three Phase</option>
        </select>
      </Label>
    </>
  );

  const renderWireProps = () => {
    if (!selectedWire) return null;
    return (
      <>
        <Label text="Wire Color">
          <div className="space-y-1.5">
            {WIRE_COLORS.map((wc) => (
              <button
                key={wc.value}
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
        <Label text="Cross Section">
          <select
            value={selectedWire.crossSection}
            onChange={(e) =>
              updateWire(selectedWire.id, {
                crossSection: Number(e.target.value),
              })
            }
            className="input-field"
          >
            {CROSS_SECTIONS.map((cs) => (
              <option key={cs} value={cs}>
                {cs} mm²
              </option>
            ))}
          </select>
        </Label>
        <Label text="Energized">
          <span
            className={`text-xs font-medium ${
              selectedWire.energized
                ? 'text-green-400'
                : tc.textMuted
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
          onClick={() => useCircuitStore.getState().removeWire(selectedWire.id)}
          className="w-full px-3 py-2 bg-red-700 text-white rounded text-xs font-medium hover:bg-red-600 mt-2"
        >
          Delete Wire
        </button>
      </>
    );
  };

  const renderTypeSpecificProps = () => {
    if (!selectedComp) return null;
    switch (selectedComp.type) {
      case 'switch':
      case 'push_button':
        return renderSwitchProps();
      case 'mcb':
        return renderMCBProps();
      case 'rcd':
        return renderRCDProps();
      case 'socket':
        return renderSocketProps();
      case 'lamp':
      case 'motor':
      case 'heater':
      case 'generic_load':
        return renderLoadProps();
      case 'power_source':
        return renderPowerSourceProps();
      default:
        return null;
    }
  };

  return (
    <div className={`w-72 ${tc.panel} ${tc.text} flex flex-col overflow-y-auto border-l ${tc.border}`}>
      <div className={`px-3 py-3 border-b ${tc.border}`}>
        <h2 className={`text-sm font-bold ${tc.textBright}`}>Properties</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {selectedComp && (
          <>
            <Label text="Label">
              <input
                type="text"
                value={selectedComp.label}
                onChange={(e) =>
                  updateComponent(selectedComp.id, {
                    label: e.target.value,
                  })
                }
                className="input-field"
              />
            </Label>

            <Label text="Type">
              <span className={`text-xs ${tc.textMuted} capitalize`}>
                {selectedComp.type.replace(/_/g, ' ')}
              </span>
            </Label>

            {renderTypeSpecificProps()}

            <div className="flex gap-1 pt-2">
              <button
                onClick={() => rotateComponent(selectedComp.id)}
                className={`flex-1 px-2 py-1.5 ${tc.btnBg} ${tc.btnText} rounded text-xs ${tc.btnHover}`}
              >
                Rotate
              </button>
              <button
                onClick={() => duplicateComponent(selectedComp.id)}
                className={`flex-1 px-2 py-1.5 ${tc.btnBg} ${tc.btnText} rounded text-xs ${tc.btnHover}`}
              >
                Duplicate
              </button>
              <button
                onClick={() => removeComponent(selectedComp.id)}
                className="flex-1 px-2 py-1.5 bg-red-700 text-white rounded text-xs hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </>
        )}

        {selectedWire && renderWireProps()}
      </div>

      {nodeResult && (
        <div className={`p-3 border-t ${tc.border} space-y-1`}>
          <h3 className={`text-xs font-semibold ${tc.textMuted} uppercase`}>
            Simulation
          </h3>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <span className={tc.textMuted}>Voltage:</span>
            <span>{nodeResult.voltageV.toFixed(1)}V</span>
            <span className={tc.textMuted}>Current:</span>
            <span>{nodeResult.currentA.toFixed(2)}A</span>
            <span className={tc.textMuted}>Power:</span>
            <span>{nodeResult.powerW.toFixed(1)}W</span>
            {nodeResult.powerFactor !== undefined && (
              <>
                <span className={tc.textMuted}>PF:</span>
                <span>{nodeResult.powerFactor.toFixed(2)}</span>
              </>
            )}
            <span className={tc.textMuted}>Status:</span>
            <span
              className={
                nodeResult.energized
                  ? 'text-green-400 font-medium'
                  : tc.textMuted
              }
            >
              {nodeResult.energized ? 'ENERGIZED' : 'DE-ENERGIZED'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const Label: React.FC<{
  text: string;
  children: React.ReactNode;
}> = ({ text, children }) => (
  <div className="space-y-1">
    <label className="text-xs text-gray-500 uppercase tracking-wider">
      {text}
    </label>
    <div>{children}</div>
  </div>
);

export default PropertyPanel;
