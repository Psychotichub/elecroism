import React, { useEffect } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import type {
  ComponentProperties,
  WireColor,
  ComponentType,
  PhaseSystem,
} from '../../types';
import { clampComponentScale, getWireColor } from '../../utils/geometry';

const WIRE_COLORS: { value: WireColor; label: string }[] = [
  { value: 'brown', label: 'Brown (L)' },
  { value: 'blue', label: 'Blue (N)' },
  { value: 'green_yellow', label: 'Green-Yellow (PE)' },
  { value: 'black', label: 'Black' },
  { value: 'grey', label: 'Grey' },
  { value: 'red', label: 'Red' },
];

const CROSS_SECTIONS = [1.5, 2.5, 4, 6, 10];

function defaultPhaseSystemForType(t: ComponentType): PhaseSystem {
  switch (t) {
    case 'dc_power_source':
    case 'ac_dc_converter':
      return 'single_phase';
    case 'three_phase_source':
    case 'three_phase_motor':
    case 'three_phase_mcb':
    case 'four_phase_mcb':
    case 'air_circuit_breaker':
    case 'motorized_mccb':
    case 'four_pole_motorized_mccb':
    case 'three_phase_contactor':
    case 'four_phase_contactor':
      return 'three_phase';
    default:
      return 'single_phase';
  }
}

const PropertyPanel: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];

  const {
    circuit,
    selectedId,
    simulationResult,
    updateComponent,
    setComponentPhaseSystem,
    setMcbPoleLayout,
    updateWire,
    toggleComponent,
    resetTripped,
    removeComponent,
    rotateComponent,
    duplicateComponent,
    acbBmsClosePulse,
    acbBmsShuntOpen,
    mccbBmsMotorClosePulse,
    mccbBmsShuntOpen,
  } = useCircuitStore();

  const selectedComp = circuit.components.find(
    (c) => c.id === selectedId
  );
  const selectedWire = circuit.wires.find((w) => w.id === selectedId);

  useEffect(() => {
    if (!selectedId) return;
    const c = useCircuitStore
      .getState()
      .circuit.components.find((x) => x.id === selectedId);
    if (!c || c.type !== 'mcb') return;
    const p = c.properties.poles;
    if (p !== undefined && p > 2) {
      useCircuitStore.getState().updateComponent(c.id, {
        properties: { ...c.properties, poles: 2 },
      });
    }
  }, [selectedId]);

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

  const updateProp = (
    updates: Partial<ComponentProperties> & {
      multimeterSignal?: 'auto' | 'ac' | 'dc';
    }
  ) => {
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

  const renderPushButtonProps = () => (
    <>
      <Label text="Contact">
        <select
          value={selectedComp!.properties.buttonType || 'NO'}
          onChange={(e) =>
            updateProp({
              buttonType: e.target.value as 'NO' | 'NC',
            })
          }
          className="input-field"
        >
          <option value="NO">Normally open (NO)</option>
          <option value="NC">Normally closed (NC)</option>
        </select>
      </Label>
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Select tool: hold on the symbol — NO closes the contact while held; NC
        opens it while held. The label shows contact state (Closed/Open), not
        “power on”.
      </p>
    </>
  );

  const renderMCBProps = (
    variant: '1p' | '3p' | '4p' | 'motorized_mccb' | 'motorized_mccb_4p' = '1p'
  ) => (
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
      {variant === '1p' && (
        <Label text="Poles">
          <div className="flex gap-1">
            {[1, 2].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() =>
                  setMcbPoleLayout(selectedComp!.id, p as 1 | 2)
                }
                className={`px-2 py-1 rounded text-xs ${
                  Math.min(2, selectedComp!.properties.poles || 1) === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {p}P
              </button>
            ))}
          </div>
          <p className={`text-[10px] ${tc.textMuted} mt-1`}>
            1P: line only · 2P: line + neutral. Three-pole use the 3P MCB device.
          </p>
        </Label>
      )}
      {(variant === '3p' ||
        variant === '4p' ||
        variant === 'motorized_mccb' ||
        variant === 'motorized_mccb_4p') && (
        <Label text="Poles">
          <span className={`text-xs ${tc.textMuted}`}>
            {variant === '4p' || variant === 'motorized_mccb_4p' ? '4' : '3'}{' '}
            (fixed)
          </span>
        </Label>
      )}
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
          {variant === 'motorized_mccb_4p'
            ? 'RESET 4P mMCCB'
            : variant === 'motorized_mccb'
              ? 'RESET mMCCB'
              : variant === '4p'
                ? 'RESET 4P MCB'
                : variant === '3p'
                  ? 'RESET 3P MCB'
                  : 'RESET MCB'}
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

  const renderHrcFuseProps = () => (
    <>
      <Label text="Fuse rating">
        <select
          value={selectedComp!.properties.ratingAmps ?? 32}
          onChange={(e) =>
            updateProp({ ratingAmps: Number(e.target.value) })
          }
          className="input-field"
        >
          {[6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160].map((a) => (
            <option key={a} value={a}>
              {a}A
            </option>
          ))}
        </select>
      </Label>
      <Label text="Breaking capacity">
        <div className="flex gap-1">
          {([6000, 10000] as const).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => updateProp({ breakingCapacity: b })}
              className={`px-2 py-1 rounded text-xs ${
                (selectedComp!.properties.breakingCapacity ?? 10000) === b
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {b / 1000}kA
            </button>
          ))}
        </div>
      </Label>
      <Label text="State">
        <button
          onClick={() => toggleComponent(selectedComp!.id)}
          className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
            selectedComp!.state === 'on'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-600 text-white hover:bg-gray-700'
          }`}
        >
          {selectedComp!.state === 'on' ? 'Healthy (closed)' : 'Isolated (open)'}
        </button>
      </Label>
      {selectedComp!.state === 'tripped' && (
        <button
          onClick={() => resetTripped(selectedComp!.id)}
          className="w-full px-3 py-2 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
        >
          Replace / reset fuse
        </button>
      )}
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Fast fault clearing is modeled with a higher instantaneous threshold than
        MCB curves. Use this on branch feeders where one-time cartridge fuses are
        specified.
      </p>
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

  const renderMpcbProps = () => (
    <>
      <Label text="Motor FLA setting">
        <select
          value={selectedComp!.properties.ratingAmps ?? 12}
          onChange={(e) =>
            updateProp({ ratingAmps: Number(e.target.value) })
          }
          className="input-field"
        >
          {[2, 4, 6, 9, 12, 16, 20, 25, 32, 40, 50, 63].map((a) => (
            <option key={a} value={a}>
              {a}A
            </option>
          ))}
        </select>
      </Label>
      <Label text="Trip class">
        <div className="flex gap-1">
          {(['10A', '10', '20', '30'] as const).map((cls) => (
            <button
              key={cls}
              type="button"
              onClick={() => updateProp({ mpcbTripClass: cls })}
              className={`px-2 py-1 rounded text-xs ${
                (selectedComp!.properties.mpcbTripClass ?? '10') === cls
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      </Label>
      <Label text="State">
        <button
          onClick={() => toggleComponent(selectedComp!.id)}
          className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
            selectedComp!.state === 'on'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-600 text-white hover:bg-gray-700'
          }`}
        >
          {selectedComp!.state === 'on' ? 'ON' : 'OFF'}
        </button>
      </Label>
      {selectedComp!.state === 'tripped' && (
        <button
          onClick={() => resetTripped(selectedComp!.id)}
          className="w-full px-3 py-2 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
        >
          RESET MPCB
        </button>
      )}
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Motor protector with adjustable thermal pickup near motor FLA and
        magnetic short-circuit trip. Place ahead of contactor + overload loop.
      </p>
    </>
  );

  const renderEarthLeakageRelayCbctProps = () => (
    <>
      <Label text="Relay rating">
        <select
          value={selectedComp!.properties.ratingAmps ?? 63}
          onChange={(e) =>
            updateProp({ ratingAmps: Number(e.target.value) })
          }
          className="input-field"
        >
          {[25, 40, 63, 100, 125].map((a) => (
            <option key={a} value={a}>
              {a}A
            </option>
          ))}
        </select>
      </Label>
      <Label text="Earth leakage setting">
        <select
          value={selectedComp!.properties.earthLeakageTripMa ?? 30}
          onChange={(e) =>
            updateProp({
              earthLeakageTripMa: Number(e.target.value) as 30 | 100 | 300 | 500,
            })
          }
          className="input-field"
        >
          {[30, 100, 300, 500].map((s) => (
            <option key={s} value={s}>
              {s}mA
            </option>
          ))}
        </select>
      </Label>
      <Label text="State">
        <button
          onClick={() => toggleComponent(selectedComp!.id)}
          className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
            selectedComp!.state === 'on'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-600 text-white hover:bg-gray-700'
          }`}
        >
          {selectedComp!.state === 'on' ? 'Armed' : 'Isolated'}
        </button>
      </Label>
      {selectedComp!.state === 'tripped' && (
        <button
          onClick={() => resetTripped(selectedComp!.id)}
          className="w-full px-3 py-2 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
        >
          RESET ELR
        </button>
      )}
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        ELR + CBCT trips on earth-fault path detection. Use for industrial
        feeder leakage protection where an RCD is not preferred.
      </p>
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
    </>
  );

  const renderAcDcConverterProps = () => (
    <>
      <Label text="DC output voltage (V)">
        <input
          type="number"
          value={selectedComp!.properties.voltage ?? 24}
          onChange={(e) =>
            updateProp({
              voltage: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className="input-field"
          min={0}
          step={0.1}
        />
      </Label>
      <Label text="Presets">
        <div className="flex gap-1 flex-wrap">
          {[5, 12, 24, 48, 110].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => updateProp({ voltage: preset })}
              className={`px-2 py-1 rounded text-xs ${
                (selectedComp!.properties.voltage ?? 24) === preset
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {preset} V
            </button>
          ))}
        </div>
      </Label>
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Wire <strong>AC_L</strong> and <strong>AC_N</strong> to mains. The
        converter only energizes its DC bus when both are present (polarity
        respected). <strong>DC_PLUS</strong> behaves like L, <strong>DC_MINUS</strong>{' '}
        like N for downstream devices. Output current isn’t back-propagated to
        the AC side in the simulator.
      </p>
    </>
  );

  const renderDcPowerSourceProps = () => (
    <>
      <Label text="DC voltage (V)">
        <input
          type="number"
          value={selectedComp!.properties.voltage ?? 24}
          onChange={(e) =>
            updateProp({
              voltage: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className="input-field"
          min={0}
          step={0.1}
        />
      </Label>
      <Label text="Presets">
        <div className="flex gap-1 flex-wrap">
          {[5, 12, 24, 48, 110].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => updateProp({ voltage: preset })}
              className={`px-2 py-1 rounded text-xs ${
                (selectedComp!.properties.voltage ?? 24) === preset
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {preset} V
            </button>
          ))}
        </div>
      </Label>
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Positive (DC_PLUS) and return (DC_MINUS) behave like L and N in the
        simulator for reachability and load current.
      </p>
    </>
  );

  const renderThreePhaseSourceProps = () => {
    const ll =
      selectedComp!.properties.lineVoltage ??
      selectedComp!.properties.voltage ??
      400;
    return (
      <>
        <Label text="Line voltage U_L-L (V)">
          <input
            type="number"
            value={ll}
            onChange={(e) => {
              const v = Math.max(0, Number(e.target.value));
              updateProp({
                lineVoltage: v,
                voltage: v,
                phaseVoltage: v / Math.sqrt(3),
              });
            }}
            className="input-field"
            min={0}
          />
        </Label>
        <Label text="Phase voltage U_L-N (V)">
          <span className={`text-xs ${tc.text}`}>
            {(ll / Math.sqrt(3)).toFixed(1)} (balanced wye)
          </span>
        </Label>
      </>
    );
  };

  const renderThreePhaseMotorProps = () => {
    const ll = selectedComp!.properties.lineVoltage ?? 400;
    return (
      <>
        <Label text="Load type">
          <select
            value={selectedComp!.properties.loadType || 'inductive'}
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
            max={500000}
          />
        </Label>
        <Label text="Power factor">
          <input
            type="number"
            value={selectedComp!.properties.powerFactor ?? 0.85}
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
        <Label text="Line voltage U_L-L">
          <div className="flex gap-1 flex-wrap">
            {[230, 400, 690].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => updateProp({ lineVoltage: v })}
                className={`px-2 py-1 rounded text-xs ${
                  ll === v
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {v}V
              </button>
            ))}
          </div>
        </Label>
        <Label text="Nameplate line current (A)">
          <input
            type="number"
            value={
              selectedComp!.properties.ratedLineAmps === undefined
                ? ''
                : selectedComp!.properties.ratedLineAmps
            }
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                updateProp({ ratedLineAmps: undefined });
                return;
              }
              updateProp({ ratedLineAmps: Math.max(0, Number(raw)) });
            }}
            className="input-field"
            min={0}
            step={0.1}
            placeholder="Optional (overload)"
          />
        </Label>
        {selectedComp!.state === 'fault' && (
          <button
            type="button"
            onClick={() => resetTripped(selectedComp!.id)}
            className="w-full px-3 py-2 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-500"
          >
            Clear motor overload / fault
          </button>
        )}
        <Label text="State">
          <span
            className={`text-xs font-medium ${
              selectedComp!.state === 'fault'
                ? 'text-red-400'
                : selectedComp!.state === 'on'
                  ? 'text-green-400'
                  : tc.textMuted
            }`}
          >
            {selectedComp!.state.toUpperCase()}
          </span>
        </Label>
      </>
    );
  };

  const renderAirCircuitBreakerProps = () => (
    <>
      <Label text="Ir (long-time, A)">
        <select
          value={selectedComp!.properties.ratingAmps || 630}
          onChange={(e) =>
            updateProp({ ratingAmps: Number(e.target.value) })
          }
          className="input-field"
        >
          {[160, 200, 250, 320, 400, 500, 630, 800, 1000, 1250, 1600].map(
            (a) => (
              <option key={a} value={a}>
                {a}A
              </option>
            )
          )}
        </select>
      </Label>
      <div className={`rounded border ${tc.border} p-2 space-y-2`}>
        <p className={`text-[10px] font-semibold ${tc.textBright}`}>
          BMS (CC / shunt / UVR / aux)
        </p>
        <p className={`text-[9px] ${tc.textMuted} leading-snug`}>
          Wiring: choose the Wire tool, then click the terminals on the ACB.
          Main power stays on the pole terminals (IN_L1…OUT_N). BMS control uses
          the extra terminals on the left of the symbol: CC_A1/A2, ST_A1/A2,
          UVR_A1/A2, AUX_52A, AUX_52B, AUX_TRIP — for your diagram to
          junctions, relay coils, or a notional BMS block. The simulator does
          not model current on those control wires; use the buttons above for
          close/open and the table below for as-built labels.
        </p>
        <Label text="BMS motor pack">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={selectedComp!.properties.acbBmsEnabled ?? false}
              onChange={(e) =>
                updateProp({ acbBmsEnabled: e.target.checked })
              }
            />
            <span className={tc.textMuted}>Enable remote control</span>
          </label>
        </Label>
        {(selectedComp!.properties.acbBmsEnabled ?? false) && (
          <>
            <Label text="Field bus (supervision)">
              <select
                value={selectedComp!.properties.acbBmsProtocol ?? 'none'}
                onChange={(e) =>
                  updateProp({
                    acbBmsProtocol: e.target
                      .value as ComponentProperties['acbBmsProtocol'],
                  })
                }
                className="input-field"
              >
                <option value="none">None (hardwired DO/DI only)</option>
                <option value="modbus_rtu">Modbus RTU</option>
                <option value="modbus_tcp">Modbus TCP</option>
                <option value="bacnet_ip">BACnet IP</option>
              </select>
            </Label>
            <Label text="UVR energized (must hold to close)">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    selectedComp!.properties.acbBmsUvrEnergized !== false
                  }
                  onChange={(e) => {
                    const c = selectedComp!;
                    const on = e.target.checked;
                    if (
                      !on &&
                      c.state === 'on' &&
                      (c.properties.acbBmsEnabled ?? false)
                    ) {
                      updateComponent(c.id, {
                        properties: {
                          ...c.properties,
                          acbBmsUvrEnergized: false,
                        },
                        state: 'off',
                      });
                    } else {
                      updateProp({ acbBmsUvrEnergized: on });
                    }
                  }}
                />
                <span className={tc.textMuted}>
                  Loss opens contacts (interlock)
                </span>
              </label>
            </Label>
            <Label text="Spring charged (motor)">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    selectedComp!.properties.acbBmsSpringCharged !== false
                  }
                  onChange={(e) =>
                    updateProp({ acbBmsSpringCharged: e.target.checked })
                  }
                />
                <span className={tc.textMuted}>CC ineffective if unchecked</span>
              </label>
            </Label>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => acbBmsClosePulse(selectedComp!.id)}
                className="w-full px-2 py-1.5 rounded text-xs font-medium bg-emerald-700 text-white hover:bg-emerald-600"
              >
                BMS DO — closing coil (CC pulse)
              </button>
              <button
                type="button"
                onClick={() => acbBmsShuntOpen(selectedComp!.id)}
                className="w-full px-2 py-1.5 rounded text-xs font-medium bg-amber-700 text-white hover:bg-amber-600"
              >
                BMS DO — shunt trip (remote OFF)
              </button>
            </div>
            <div className={`space-y-2 rounded border ${tc.border} bg-black/10 p-2`}>
              <p className={`text-[10px] font-semibold ${tc.textBright}`}>
                Panel schedule — control wiring (as-built)
              </p>
              <Label text="Control supply">
                <select
                  value={selectedComp!.properties.acbCtrlSupply ?? '24dc'}
                  onChange={(e) =>
                    updateProp({
                      acbCtrlSupply: e.target
                        .value as ComponentProperties['acbCtrlSupply'],
                    })
                  }
                  className="input-field"
                >
                  <option value="24dc">+24 V DC (typ. BMS)</option>
                  <option value="110dc">110 V DC</option>
                  <option value="230ac">230 V AC</option>
                </select>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Label text="Fuse ref">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="F1"
                    value={
                      selectedComp!.properties.acbCtrlFuseDesignation ?? 'F1'
                    }
                    onChange={(e) =>
                      updateProp({
                        acbCtrlFuseDesignation:
                          e.target.value.trim() || 'F1',
                      })
                    }
                  />
                </Label>
                <Label text="Fuse (A)">
                  <select
                    value={String(
                      selectedComp!.properties.acbCtrlFuseAmps ?? 2
                    )}
                    onChange={(e) =>
                      updateProp({
                        acbCtrlFuseAmps: Number(e.target.value) || 2,
                      })
                    }
                    className="input-field"
                  >
                    {[1, 2, 4, 6, 10].map((a) => (
                      <option key={a} value={a}>
                        {a} A
                      </option>
                    ))}
                  </select>
                </Label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Label text="Interposing relay — CC">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="K1"
                    value={selectedComp!.properties.acbRelayCcId ?? 'K1'}
                    onChange={(e) =>
                      updateProp({
                        acbRelayCcId: e.target.value.trim() || 'K1',
                      })
                    }
                  />
                </Label>
                <Label text="Interposing relay — shunt">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="K2"
                    value={selectedComp!.properties.acbRelayStId ?? 'K2'}
                    onChange={(e) =>
                      updateProp({
                        acbRelayStId: e.target.value.trim() || 'K2',
                      })
                    }
                  />
                </Label>
              </div>
              <p className={`text-[9px] ${tc.textMuted}`}>
                Never land BMS DO directly on ACB coils — use NO contacts of{' '}
                {selectedComp!.properties.acbRelayCcId ?? 'K1'} /{' '}
                {selectedComp!.properties.acbRelayStId ?? 'K2'} per manufacturer
                data sheet.
              </p>
              <div className="grid grid-cols-1 gap-1 text-[9px]">
                <Label text="BMS DO tags (labels)">
                  <div className="flex gap-1">
                    <input
                      className="input-field flex-1"
                      placeholder="DO-CC"
                      value={
                        selectedComp!.properties.acbBmsDoCloseTag ?? 'DO-CC'
                      }
                      onChange={(e) =>
                        updateProp({
                          acbBmsDoCloseTag: e.target.value.trim() || 'DO-CC',
                        })
                      }
                    />
                    <input
                      className="input-field flex-1"
                      placeholder="DO-ST"
                      value={
                        selectedComp!.properties.acbBmsDoOpenTag ?? 'DO-ST'
                      }
                      onChange={(e) =>
                        updateProp({
                          acbBmsDoOpenTag: e.target.value.trim() || 'DO-ST',
                        })
                      }
                    />
                  </div>
                </Label>
                <Label text="BMS DI tags (aux)">
                  <div className="grid grid-cols-3 gap-1">
                    <input
                      className="input-field"
                      placeholder="DI-52a"
                      value={
                        selectedComp!.properties.acbBmsDi52aTag ?? 'DI-52a'
                      }
                      onChange={(e) =>
                        updateProp({
                          acbBmsDi52aTag: e.target.value.trim() || 'DI-52a',
                        })
                      }
                    />
                    <input
                      className="input-field"
                      placeholder="DI-52b"
                      value={
                        selectedComp!.properties.acbBmsDi52bTag ?? 'DI-52b'
                      }
                      onChange={(e) =>
                        updateProp({
                          acbBmsDi52bTag: e.target.value.trim() || 'DI-52b',
                        })
                      }
                    />
                    <input
                      className="input-field"
                      placeholder="DI-TRIP"
                      value={
                        selectedComp!.properties.acbBmsDiTripTag ?? 'DI-TRIP'
                      }
                      onChange={(e) =>
                        updateProp({
                          acbBmsDiTripTag: e.target.value.trim() || 'DI-TRIP',
                        })
                      }
                    />
                  </div>
                </Label>
              </div>
              {(() => {
                const pr = selectedComp!.properties;
                const pos =
                  pr.acbCtrlSupply === '110dc'
                    ? '+110 V DC'
                    : pr.acbCtrlSupply === '230ac'
                      ? 'L (230 V AC)'
                      : '+24 V DC';
                const fuseRef = pr.acbCtrlFuseDesignation ?? 'F1';
                const fuseA = pr.acbCtrlFuseAmps ?? 2;
                const kCc = pr.acbRelayCcId ?? 'K1';
                const kSt = pr.acbRelayStId ?? 'K2';
                const doC = pr.acbBmsDoCloseTag ?? 'DO-CC';
                const doO = pr.acbBmsDoOpenTag ?? 'DO-ST';
                const diA = pr.acbBmsDi52aTag ?? 'DI-52a';
                const diB = pr.acbBmsDi52bTag ?? 'DI-52b';
                const diT = pr.acbBmsDiTripTag ?? 'DI-TRIP';
                const neg =
                  pr.acbCtrlSupply === '230ac' ? 'N (AC return)' : '0 V / GND';
                const rows: [string, string, string][] = [
                  [
                    'Control + (after fuse)',
                    `${fuseRef} (${fuseA} A)`,
                    `${pos} → ${fuseRef} → bus`,
                  ],
                  [
                    'UVR hold',
                    'UVR A1 / A2',
                    `${pos} → UVR A1; ${neg} → UVR A2 (continuous)`,
                  ],
                  [
                    'Closing coil (pulse)',
                    'CC A1 / A2',
                    `${doC} → ${kCc} coil → ${kCc} NO → CC A1–A2; return ${neg}`,
                  ],
                  [
                    'Shunt trip (open)',
                    'ST A1 / A2',
                    `${doO} → ${kSt} coil → ${kSt} NO → ST A1–A2; return ${neg}`,
                  ],
                  [
                    'Aux — breaker closed',
                    'AUX_52A',
                    `AUX_52A → ${diA} (BMS DI)`,
                  ],
                  [
                    'Aux — breaker open',
                    'AUX_52B',
                    `AUX_52B → ${diB} (BMS DI)`,
                  ],
                  [
                    'Aux — trip / fault',
                    'AUX_TRIP',
                    `AUX_TRIP → ${diT} (BMS DI)`,
                  ],
                ];
                return (
                  <div className="overflow-x-auto">
                    <table
                      className={`w-full text-left text-[9px] border-collapse ${tc.text}`}
                    >
                      <thead>
                        <tr className={tc.textMuted}>
                          <th className="border border-gray-600/50 px-1 py-0.5 font-medium">
                            Function
                          </th>
                          <th className="border border-gray-600/50 px-1 py-0.5 font-medium">
                            ACB terminals
                          </th>
                          <th className="border border-gray-600/50 px-1 py-0.5 font-medium">
                            Route
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(([fn, term, route]) => (
                          <tr key={fn}>
                            <td className="border border-gray-600/40 px-1 py-0.5 align-top">
                              {fn}
                            </td>
                            <td className="border border-gray-600/40 px-1 py-0.5 align-top font-mono">
                              {term}
                            </td>
                            <td className="border border-gray-600/40 px-1 py-0.5 align-top">
                              {route}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
              <p className={`text-[9px] ${tc.textMuted} leading-snug`}>
                CC: short pulse only (≈0.5–1 s). Do not hold energised. Shunt:
                energise to trip open. Trip unit (LSIG) operates independently
                of BMS. Terminal lettering follows common IEC-style A1/A2
                naming; factory numbering may differ — verify against the device
                sheet.
              </p>
            </div>
          </>
        )}
      </div>
      <Label text="Instantaneous (×Ir)">
        <div className="flex gap-1 flex-wrap">
          {[5, 6, 8, 10, 12, 15].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => updateProp({ acbInstantaneousMult: m })}
              className={`px-2 py-1 rounded text-xs ${
                (selectedComp!.properties.acbInstantaneousMult ?? 10) === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {m}×
            </button>
          ))}
        </div>
      </Label>
      <Label text="Short-time (×Ir)">
        <div className="flex gap-1 flex-wrap">
          {[3, 4, 5, 6, 8].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => updateProp({ acbShortTimeMult: m })}
              className={`px-2 py-1 rounded text-xs ${
                (selectedComp!.properties.acbShortTimeMult ?? 6) === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {m}×
            </button>
          ))}
        </div>
      </Label>
      <Label text="Earth-fault G">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={
              selectedComp!.properties.acbEarthFaultEnabled ?? false
            }
            onChange={(e) =>
              updateProp({ acbEarthFaultEnabled: e.target.checked })
            }
          />
          <span className={tc.textMuted}>Enable Ig trip</span>
        </label>
      </Label>
      {(selectedComp!.properties.acbEarthFaultEnabled ?? false) && (
        <Label text="Ig (A)">
          <select
            value={selectedComp!.properties.acbEarthFaultAmps || 120}
            onChange={(e) =>
              updateProp({ acbEarthFaultAmps: Number(e.target.value) })
            }
            className="input-field"
          >
            {[30, 60, 120, 200, 300, 500].map((g) => (
              <option key={g} value={g}>
                {g}A
              </option>
            ))}
          </select>
        </Label>
      )}
      <Label text="Line frequency (½-cycle delay)">
        <div className="flex gap-1">
          {[50, 60].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => updateProp({ acbLineFrequencyHz: f })}
              className={`px-2 py-1 rounded text-xs ${
                (selectedComp!.properties.acbLineFrequencyHz ?? 50) === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {f} Hz
            </button>
          ))}
        </div>
      </Label>
      <Label text="ST definite delay (s)">
        <input
          type="number"
          min={0}
          step={0.01}
          value={selectedComp!.properties.acbShortTimeDelayS ?? 0.18}
          onChange={(e) =>
            updateProp({
              acbShortTimeDelayS: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className="input-field"
        />
      </Label>
      <Label text="Earth definite delay (s)">
        <input
          type="number"
          min={0}
          step={0.01}
          value={selectedComp!.properties.acbEarthFaultDelayS ?? 0.1}
          onChange={(e) =>
            updateProp({
              acbEarthFaultDelayS: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className="input-field"
        />
      </Label>
      <Label text="Long-time trip integral">
        <input
          type="number"
          min={5}
          step={1}
          value={selectedComp!.properties.acbThermalTripIntegral ?? 80}
          onChange={(e) =>
            updateProp({
              acbThermalTripIntegral: Math.max(
                5,
                Number(e.target.value) || 80
              ),
            })
          }
          className="input-field"
        />
      </Label>
      <Label text="Breaking capacity">
        <div className="flex gap-1">
          {([6000, 10000] as const).map((b) => (
            <button
              key={b}
              type="button"
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
      <Label text="Design voltage U_L-L">
        <div className="flex gap-1 flex-wrap">
          {[230, 400, 690].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => updateProp({ lineVoltage: v })}
              className={`px-2 py-1 rounded text-xs ${
                (selectedComp!.properties.lineVoltage ?? 400) === v
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {v}V
            </button>
          ))}
        </div>
      </Label>
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Simulation: inverse-time long-time (∫ below ST pickup); definite
        short-time and earth delays; instantaneous pickup with ~½-cycle
        current-zero / arc-chute wording in trip text. Re-run simulation as
        time advances (wall clock between runs, capped per step).
      </p>
      {selectedComp!.state === 'tripped' && (
        <button
          type="button"
          onClick={() => resetTripped(selectedComp!.id)}
          className="w-full px-3 py-2 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
        >
          RESET ACB
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

  const renderMultipoleMcbProps = () => {
    const variant =
      selectedComp!.type === 'four_phase_mcb' ? '4p' : '3p';
    return (
    <>
      {renderMCBProps(variant)}
      <Label text="Design voltage U_L-L">
        <div className="flex gap-1 flex-wrap">
          {[230, 400, 690].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => updateProp({ lineVoltage: v })}
              className={`px-2 py-1 rounded text-xs ${
                (selectedComp!.properties.lineVoltage ?? 400) === v
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
  };

  const renderMotorizedMccbProps = () => {
    const mccbVariant =
      selectedComp!.type === 'four_pole_motorized_mccb'
        ? 'motorized_mccb_4p'
        : 'motorized_mccb';
    return (
    <>
      {renderMCBProps(mccbVariant)}
      <Label text="Design voltage U_L-L">
        <div className="flex gap-1 flex-wrap">
          {[230, 400, 690].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => updateProp({ lineVoltage: v })}
              className={`px-2 py-1 rounded text-xs ${
                (selectedComp!.properties.lineVoltage ?? 400) === v
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {v}V
            </button>
          ))}
        </div>
      </Label>
      <div className={`rounded border ${tc.border} p-2 space-y-2`}>
        <p className={`text-[10px] font-semibold ${tc.textBright}`}>
          BMS (motor ON / shunt / aux / trip)
        </p>
        <p className={`text-[9px] ${tc.textMuted} leading-snug`}>
          Wire the <strong>power</strong> poles (IN_L1…OUT_L3) like a 3P MCB.
          On the <strong>left</strong> of the symbol: MOT_A1/A2 (motor close),
          ST_A1/A2 (shunt trip), AUX_COM / AUX_NO / AUX_NC (status changeover),
          TRIP_T1/T2 (fault contact). Simulator does not model control-circuit
          current — use the buttons for remote ON/OFF and the table for
          as-built tags.
        </p>
        <Label text="BMS enabled">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={selectedComp!.properties.mccbBmsEnabled ?? false}
              onChange={(e) =>
                updateProp({ mccbBmsEnabled: e.target.checked })
              }
            />
            <span className={tc.textMuted}>Remote motor + shunt (BMS/PLC)</span>
          </label>
        </Label>
        {(selectedComp!.properties.mccbBmsEnabled ?? false) && (
          <>
            <Label text="Field bus (supervision)">
              <select
                value={selectedComp!.properties.mccbBmsProtocol ?? 'none'}
                onChange={(e) =>
                  updateProp({
                    mccbBmsProtocol: e.target
                      .value as ComponentProperties['mccbBmsProtocol'],
                  })
                }
                className="input-field"
              >
                <option value="none">None (hardwired DO/DI only)</option>
                <option value="modbus_rtu">Modbus RTU</option>
                <option value="modbus_tcp">Modbus TCP</option>
                <option value="bacnet_ip">BACnet IP</option>
              </select>
            </Label>
            <Label text="Control supply present">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    selectedComp!.properties.mccbBmsCtrlVoltageOk !== false
                  }
                  onChange={(e) => {
                    const c = selectedComp!;
                    const on = e.target.checked;
                    if (
                      !on &&
                      c.state === 'on' &&
                      (c.properties.mccbBmsEnabled ?? false)
                    ) {
                      updateComponent(c.id, {
                        properties: {
                          ...c.properties,
                          mccbBmsCtrlVoltageOk: false,
                        },
                        state: 'off',
                      });
                    } else {
                      updateProp({ mccbBmsCtrlVoltageOk: on });
                    }
                  }}
                />
                <span className={tc.textMuted}>
                  Interlock — loss opens main path in sim
                </span>
              </label>
            </Label>
            <Label text="Mechanism ready (spring / motor ready)">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    selectedComp!.properties.mccbBmsMotorReady !== false
                  }
                  onChange={(e) =>
                    updateProp({ mccbBmsMotorReady: e.target.checked })
                  }
                />
                <span className={tc.textMuted}>
                  Motor close pulse ignored if unchecked
                </span>
              </label>
            </Label>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => mccbBmsMotorClosePulse(selectedComp!.id)}
                className="w-full px-2 py-1.5 rounded text-xs font-medium bg-emerald-700 text-white hover:bg-emerald-600"
              >
                BMS DO — motor close (remote ON)
              </button>
              <button
                type="button"
                onClick={() => mccbBmsShuntOpen(selectedComp!.id)}
                className="w-full px-2 py-1.5 rounded text-xs font-medium bg-amber-700 text-white hover:bg-amber-600"
              >
                BMS DO — shunt trip (remote OFF)
              </button>
            </div>
            <div className={`space-y-2 rounded border ${tc.border} bg-black/10 p-2`}>
              <p className={`text-[10px] font-semibold ${tc.textBright}`}>
                Panel schedule — control wiring
              </p>
              <Label text="Control supply">
                <select
                  value={selectedComp!.properties.mccbCtrlSupply ?? '24dc'}
                  onChange={(e) =>
                    updateProp({
                      mccbCtrlSupply: e.target
                        .value as ComponentProperties['mccbCtrlSupply'],
                    })
                  }
                  className="input-field"
                >
                  <option value="24dc">+24 V DC (typ. BMS)</option>
                  <option value="110dc">110 V DC</option>
                  <option value="230ac">230 V AC</option>
                </select>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Label text="Fuse ref">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="F1"
                    value={
                      selectedComp!.properties.mccbCtrlFuseDesignation ?? 'F1'
                    }
                    onChange={(e) =>
                      updateProp({
                        mccbCtrlFuseDesignation:
                          e.target.value.trim() || 'F1',
                      })
                    }
                  />
                </Label>
                <Label text="Fuse (A)">
                  <select
                    value={String(
                      selectedComp!.properties.mccbCtrlFuseAmps ?? 2
                    )}
                    onChange={(e) =>
                      updateProp({
                        mccbCtrlFuseAmps: Number(e.target.value) || 2,
                      })
                    }
                    className="input-field"
                  >
                    {[1, 2, 4, 6, 10].map((a) => (
                      <option key={a} value={a}>
                        {a} A
                      </option>
                    ))}
                  </select>
                </Label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Label text="Interposing relay — motor">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="K1"
                    value={selectedComp!.properties.mccbRelayMotorId ?? 'K1'}
                    onChange={(e) =>
                      updateProp({
                        mccbRelayMotorId: e.target.value.trim() || 'K1',
                      })
                    }
                  />
                </Label>
                <Label text="Interposing relay — shunt">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="K2"
                    value={selectedComp!.properties.mccbRelayStId ?? 'K2'}
                    onChange={(e) =>
                      updateProp({
                        mccbRelayStId: e.target.value.trim() || 'K2',
                      })
                    }
                  />
                </Label>
              </div>
              <p className={`text-[9px] ${tc.textMuted}`}>
                Use interposing relays per manufacturer — do not land BMS DOs
                directly on motor or shunt coils.
              </p>
              <div className="grid grid-cols-1 gap-1 text-[9px]">
                <Label text="BMS DO tags">
                  <div className="flex gap-1">
                    <input
                      className="input-field flex-1"
                      placeholder="DO-MOTOR"
                      value={
                        selectedComp!.properties.mccbBmsDoMotorTag ??
                        'DO-MOTOR'
                      }
                      onChange={(e) =>
                        updateProp({
                          mccbBmsDoMotorTag:
                            e.target.value.trim() || 'DO-MOTOR',
                        })
                      }
                    />
                    <input
                      className="input-field flex-1"
                      placeholder="DO-ST"
                      value={
                        selectedComp!.properties.mccbBmsDoShuntTag ?? 'DO-ST'
                      }
                      onChange={(e) =>
                        updateProp({
                          mccbBmsDoShuntTag:
                            e.target.value.trim() || 'DO-ST',
                        })
                      }
                    />
                  </div>
                </Label>
                <Label text="BMS DI tags">
                  <div className="grid grid-cols-3 gap-1">
                    <input
                      className="input-field"
                      placeholder="DI-AUX-NO"
                      value={
                        selectedComp!.properties.mccbBmsDiAuxNoTag ??
                        'DI-AUX-NO'
                      }
                      onChange={(e) =>
                        updateProp({
                          mccbBmsDiAuxNoTag:
                            e.target.value.trim() || 'DI-AUX-NO',
                        })
                      }
                    />
                    <input
                      className="input-field"
                      placeholder="DI-AUX-NC"
                      value={
                        selectedComp!.properties.mccbBmsDiAuxNcTag ??
                        'DI-AUX-NC'
                      }
                      onChange={(e) =>
                        updateProp({
                          mccbBmsDiAuxNcTag:
                            e.target.value.trim() || 'DI-AUX-NC',
                        })
                      }
                    />
                    <input
                      className="input-field"
                      placeholder="DI-TRIP"
                      value={
                        selectedComp!.properties.mccbBmsDiTripTag ??
                        'DI-TRIP'
                      }
                      onChange={(e) =>
                        updateProp({
                          mccbBmsDiTripTag:
                            e.target.value.trim() || 'DI-TRIP',
                        })
                      }
                    />
                  </div>
                </Label>
              </div>
              {(() => {
                const pr = selectedComp!.properties;
                const pos =
                  pr.mccbCtrlSupply === '110dc'
                    ? '+110 V DC'
                    : pr.mccbCtrlSupply === '230ac'
                      ? 'L (230 V AC)'
                      : '+24 V DC';
                const fuseRef = pr.mccbCtrlFuseDesignation ?? 'F1';
                const fuseA = pr.mccbCtrlFuseAmps ?? 2;
                const kM = pr.mccbRelayMotorId ?? 'K1';
                const kS = pr.mccbRelayStId ?? 'K2';
                const doM = pr.mccbBmsDoMotorTag ?? 'DO-MOTOR';
                const doS = pr.mccbBmsDoShuntTag ?? 'DO-ST';
                const diN = pr.mccbBmsDiAuxNoTag ?? 'DI-AUX-NO';
                const diC = pr.mccbBmsDiAuxNcTag ?? 'DI-AUX-NC';
                const diT = pr.mccbBmsDiTripTag ?? 'DI-TRIP';
                const neg =
                  pr.mccbCtrlSupply === '230ac' ? 'N (AC return)' : '0 V / GND';
                const rows: [string, string, string][] = [
                  [
                    'Control + (after fuse)',
                    `${fuseRef} (${fuseA} A)`,
                    `${pos} → ${fuseRef} → bus`,
                  ],
                  [
                    'Motor close (pulse)',
                    'MOT_A1 / MOT_A2',
                    `${doM} → ${kM} coil → ${kM} NO → MOT_A1–A2; return ${neg}`,
                  ],
                  [
                    'Shunt trip (open)',
                    'ST_A1 / ST_A2',
                    `${doS} → ${kS} coil → ${kS} NO → ST_A1–A2; return ${neg}`,
                  ],
                  ['Aux common', 'AUX_COM', `Common for changeover aux`],
                  [
                    'Aux — closed (NO to COM)',
                    'AUX_NO',
                    `AUX_NO → ${diN} when breaker closed`,
                  ],
                  [
                    'Aux — open (NC to COM)',
                    'AUX_NC',
                    `AUX_NC → ${diC} when breaker open / trip`,
                  ],
                  [
                    'Trip contact',
                    'TRIP_T1 / T2',
                    `TRIP → ${diT} (BMS DI on protection trip)`,
                  ],
                ];
                return (
                  <div className="overflow-x-auto">
                    <table
                      className={`w-full text-left text-[9px] border-collapse ${tc.text}`}
                    >
                      <thead>
                        <tr className={tc.textMuted}>
                          <th className="border border-gray-600/50 px-1 py-0.5 font-medium">
                            Function
                          </th>
                          <th className="border border-gray-600/50 px-1 py-0.5 font-medium">
                            Terminals
                          </th>
                          <th className="border border-gray-600/50 px-1 py-0.5 font-medium">
                            Route
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(([fn, term, route]) => (
                          <tr key={fn}>
                            <td className="border border-gray-600/40 px-1 py-0.5 align-top">
                              {fn}
                            </td>
                            <td className="border border-gray-600/40 px-1 py-0.5 align-top font-mono">
                              {term}
                            </td>
                            <td className="border border-gray-600/40 px-1 py-0.5 align-top">
                              {route}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
              <p className={`text-[9px] ${tc.textMuted} leading-snug`}>
                Motor is pulsed to close; shunt is energised to trip. Thermal /
                magnetic protection still trips the MCCB independently of BMS.
              </p>
            </div>
          </>
        )}
      </div>
    </>
    );
  };

  const renderThreePhaseContactorProps = () => {
    const variant =
      selectedComp!.type === 'four_phase_contactor' ? '4p' : '3p';
    return (
      <>
        <Label text="Poles">
          <span className={`text-xs ${tc.textMuted}`}>
            {variant === '4p' ? '4' : '3'} power + coil A1/A2
          </span>
        </Label>
        <Label text="Rating (A)">
          <select
            value={selectedComp!.properties.ratingAmps || 25}
            onChange={(e) =>
              updateProp({ ratingAmps: Number(e.target.value) })
            }
            className="input-field"
          >
            {[16, 25, 32, 40, 63, 80, 100].map((a) => (
              <option key={a} value={a}>
                {a}A
              </option>
            ))}
          </select>
        </Label>
        <Label text="Design voltage U_L-L">
          <div className="flex gap-1 flex-wrap">
            {[230, 400, 690].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => updateProp({ lineVoltage: v })}
                className={`px-2 py-1 rounded text-xs ${
                  (selectedComp!.properties.lineVoltage ?? 400) === v
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {v}V
              </button>
            ))}
          </div>
        </Label>
        <Label text="Power path (simulated)">
          <span
            className={`text-xs font-medium ${
              selectedComp!.state === 'on'
                ? 'text-green-400'
                : tc.textMuted
            }`}
          >
            {selectedComp!.state === 'on'
              ? 'Closed — coil has live + neutral'
              : 'Open — energize A1 and A2 (live ↔ neutral)'}
          </span>
        </Label>
        <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
          Main contacts close only when the coil terminals see line on one side
          and neutral on the other. Coil voltage is not modeled numerically.
        </p>
      </>
    );
  };

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

  const renderEStopProps = () => (
    <>
      <Label text="State">
        <span
          className={`text-xs font-medium ${
            selectedComp!.state === 'on' ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {selectedComp!.state === 'on'
            ? 'NC contact CLOSED (head not pressed)'
            : 'LATCHED — circuit OPEN'}
        </span>
      </Label>
      <button
        type="button"
        onClick={() => toggleComponent(selectedComp!.id)}
        className={`w-full px-3 py-2 rounded text-xs font-semibold ${
          selectedComp!.state === 'on'
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {selectedComp!.state === 'on'
          ? 'PRESS — Latch open'
          : 'TWIST TO RELEASE — Reset'}
      </button>
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Wire <strong>IN/OUT</strong> in series with the contactor coil A1/A2
        loop. Pressing the head latches the contact open until reset, killing
        every coil downstream.
      </p>
    </>
  );

  const renderDoorInterlockProps = () => (
    <>
      <Label text="Door state">
        <span
          className={`text-xs font-medium ${
            selectedComp!.state === 'on' ? 'text-green-400' : 'text-yellow-300'
          }`}
        >
          {selectedComp!.state === 'on'
            ? 'Door CLOSED — interlock contact CLOSED'
            : 'Door OPEN — interlock contact OPEN'}
        </span>
      </Label>
      <button
        type="button"
        onClick={() => toggleComponent(selectedComp!.id)}
        className={`w-full px-3 py-2 rounded text-xs font-semibold ${
          selectedComp!.state === 'on'
            ? 'bg-yellow-600 text-white hover:bg-yellow-700'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {selectedComp!.state === 'on' ? 'Open door' : 'Close door'}
      </button>
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Use this in series with coil circuits so opening the panel door removes
        control power to hazardous motion.
      </p>
    </>
  );

  const renderSelectorSwitchProps = () => {
    const positions: ('OFF' | 'AUTO' | 'MANUAL')[] = ['OFF', 'AUTO', 'MANUAL'];
    const cur = selectedComp!.properties.selectorPosition ?? 'OFF';
    return (
      <>
        <Label text="Position">
          <div className="flex gap-1">
            {positions.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => updateProp({ selectorPosition: p })}
                className={`flex-1 px-2 py-1 rounded text-xs ${
                  cur === p
                    ? p === 'AUTO'
                      ? 'bg-emerald-600 text-white'
                      : p === 'MANUAL'
                        ? 'bg-sky-600 text-white'
                        : 'bg-gray-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </Label>
        <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
          AUTO bridges <strong>COM ↔ AUTO</strong> (BMS / interlock control of
          the coil). MANUAL bridges <strong>COM ↔ MAN</strong> (panel push-
          buttons). OFF opens both, isolating the contactor.
        </p>
      </>
    );
  };

  const renderIndicatorLampProps = () => {
    const colors: {
      v: 'red' | 'green' | 'amber' | 'blue' | 'white';
      label: string;
      hex: string;
    }[] = [
      { v: 'red', label: 'Red', hex: '#EF4444' },
      { v: 'green', label: 'Green', hex: '#22C55E' },
      { v: 'amber', label: 'Amber', hex: '#F59E0B' },
      { v: 'blue', label: 'Blue', hex: '#3B82F6' },
      { v: 'white', label: 'White', hex: '#F3F4F6' },
    ];
    const tags: ComponentProperties['indicatorPhaseTag'][] = [
      'L',
      'L1',
      'L2',
      'L3',
      'N',
      'PE',
      'AUX',
    ];
    return (
      <>
        <Label text="Lens colour">
          <div className="flex gap-1 flex-wrap">
            {colors.map((c) => (
              <button
                key={c.v}
                type="button"
                onClick={() => updateProp({ indicatorColor: c.v })}
                className={`w-7 h-7 rounded border-2 flex items-center justify-center ${
                  selectedComp!.properties.indicatorColor === c.v
                    ? 'border-blue-500'
                    : 'border-transparent hover:border-gray-500'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.label}
              />
            ))}
          </div>
        </Label>
        <Label text="Phase tag (label)">
          <div className="flex gap-1 flex-wrap">
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => updateProp({ indicatorPhaseTag: t })}
                className={`px-2 py-1 rounded text-xs ${
                  (selectedComp!.properties.indicatorPhaseTag ?? 'L') === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Label>
        <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
          Wire <strong>L</strong> to the phase you want indicated and{' '}
          <strong>N</strong> to neutral. The lamp lights any time both terminals
          see a valid live ↔ neutral pair.
        </p>
      </>
    );
  };

  const renderPhaseIndicatorBankProps = () => (
    <>
      <Label text="Line voltage (V L-L)">
        <input
          type="number"
          value={selectedComp!.properties.lineVoltage ?? 400}
          onChange={(e) =>
            updateProp({ lineVoltage: Math.max(1, Number(e.target.value) || 1) })
          }
          className="input-field"
          min={1}
        />
      </Label>
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Three phase presence indicator bank (L1/L2/L3) with shared neutral.
        Use for panel-front phase healthy indication.
      </p>
    </>
  );

  const renderSmpsProps = () => (
    <>
      <Label text="DC output voltage (V)">
        <input
          type="number"
          value={selectedComp!.properties.voltage ?? 24}
          onChange={(e) =>
            updateProp({
              voltage: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className="input-field"
          min={0}
          step={0.1}
        />
      </Label>
      <Label text="Presets">
        <div className="flex gap-1 flex-wrap">
          {[5, 12, 24, 48, 110].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => updateProp({ voltage: p })}
              className={`px-2 py-1 rounded text-xs ${
                (selectedComp!.properties.voltage ?? 24) === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {p} V
            </button>
          ))}
        </div>
      </Label>
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Wire <strong>AC_L</strong> + <strong>AC_N</strong> to mains; the DC
        bus (<strong>V+ / V−</strong>) only energizes when both AC terminals
        are correctly placed (polarity respected). Same engine model as the
        AC/DC converter; choose this symbol when you specifically want a
        <em> switching</em> PSU on the diagram.
      </p>
    </>
  );

  const renderControlTransformerProps = () => (
    <>
      <Label text="Secondary voltage (V)">
        <input
          type="number"
          value={selectedComp!.properties.voltage ?? 24}
          onChange={(e) =>
            updateProp({
              voltage: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className="input-field"
          min={0}
          step={1}
        />
      </Label>
      <Label text="Typical presets">
        <div className="flex gap-1 flex-wrap">
          {[24, 48, 110, 230].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => updateProp({ voltage: p })}
              className={`px-2 py-1 rounded text-xs ${
                (selectedComp!.properties.voltage ?? 24) === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {p} V
            </button>
          ))}
        </div>
      </Label>
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Primary is <strong>PRI_L / PRI_N</strong>; secondary is{' '}
        <strong>SEC_L / SEC_N</strong>. Use this when the control circuit needs
        isolation and a stepped-down AC control voltage.
      </p>
    </>
  );

  const renderModbusTcpGatewayProps = () => (
    <>
      <Label text="Gateway IP">
        <input
          type="text"
          value={selectedComp!.properties.gatewayIp ?? '192.168.1.100'}
          onChange={(e) => updateProp({ gatewayIp: e.target.value })}
          className="input-field"
        />
      </Label>
      <Label text="TCP port">
        <input
          type="number"
          value={selectedComp!.properties.gatewayPort ?? 502}
          onChange={(e) =>
            updateProp({ gatewayPort: Math.max(1, Number(e.target.value) || 1) })
          }
          className="input-field"
          min={1}
          max={65535}
        />
      </Label>
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Use this for BMS supervisory comms. It is a documentation/control object
        with optional control power terminals <strong>PWR_L / PWR_N</strong>.
      </p>
    </>
  );

  const renderBacnetIpGatewayProps = () => (
    <>
      <Label text="Gateway IP">
        <input
          type="text"
          value={selectedComp!.properties.gatewayIp ?? '192.168.1.110'}
          onChange={(e) => updateProp({ gatewayIp: e.target.value })}
          className="input-field"
        />
      </Label>
      <Label text="UDP port">
        <input
          type="number"
          value={selectedComp!.properties.gatewayPort ?? 47808}
          onChange={(e) =>
            updateProp({ gatewayPort: Math.max(1, Number(e.target.value) || 1) })
          }
          className="input-field"
          min={1}
          max={65535}
        />
      </Label>
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        BACnet/IP endpoint for BMS integration (default UDP 47808). Optional
        control power can be wired via <strong>PWR_L / PWR_N</strong>.
      </p>
    </>
  );

  const renderBmsIOModuleProps = () => (
    <>
      <Label text="Channels">
        <input
          type="number"
          value={
            selectedComp!.properties.ioChannels ??
            (selectedComp!.type === 'ai_module' || selectedComp!.type === 'ao_module'
              ? 4
              : 8)
          }
          onChange={(e) =>
            updateProp({ ioChannels: Math.max(1, Number(e.target.value) || 1) })
          }
          className="input-field"
          min={1}
          max={64}
        />
      </Label>
      {(selectedComp!.type === 'ai_module' || selectedComp!.type === 'ao_module') && (
        <Label text="Signal type">
          <div className="flex gap-1">
            {(['0_10v', '4_20ma'] as const).map((sig) => (
              <button
                key={sig}
                type="button"
                onClick={() =>
                  selectedComp!.type === 'ai_module'
                    ? updateProp({ aiSignalType: sig })
                    : updateProp({ aoSignalType: sig })
                }
                className={`px-2 py-1 rounded text-xs ${
                  (selectedComp!.type === 'ai_module'
                    ? selectedComp!.properties.aiSignalType ?? '0_10v'
                    : selectedComp!.properties.aoSignalType ?? '0_10v') === sig
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {sig === '0_10v' ? '0-10V' : '4-20mA'}
              </button>
            ))}
          </div>
        </Label>
      )}
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Use DI/DO for status/command points and AI/AO for analog process values.
        Wire module power on <strong>PWR_L / PWR_N</strong>; channel points are
        represented as properties for planning-level diagrams.
      </p>
    </>
  );

  const renderCommInfraProps = () => (
    <>
      {(selectedComp!.type === 'communication_converter' ||
        selectedComp!.type === 'iot_gateway' ||
        selectedComp!.type === 'cloud_monitoring_module' ||
        selectedComp!.type === 'energy_management_controller' ||
        selectedComp!.type === 'ethernet_switch') && (
        <>
          <Label
            text={
              selectedComp!.type === 'ethernet_switch'
                ? 'Management IP'
                : selectedComp!.type === 'iot_gateway'
                  ? 'Gateway IP'
                  : selectedComp!.type === 'cloud_monitoring_module'
                    ? 'Cloud endpoint'
                  : selectedComp!.type === 'energy_management_controller'
                    ? 'Controller IP'
                : 'Endpoint IP'
            }
          >
            <input
              type="text"
              value={
                selectedComp!.properties.gatewayIp ??
                (selectedComp!.type === 'ethernet_switch'
                  ? '192.168.1.200'
                  : selectedComp!.type === 'iot_gateway'
                    ? '10.10.10.10'
                    : selectedComp!.type === 'cloud_monitoring_module'
                      ? 'cloud.bms.local'
                      : selectedComp!.type === 'energy_management_controller'
                        ? '192.168.1.210'
                  : '192.168.1.120')
              }
              onChange={(e) => updateProp({ gatewayIp: e.target.value })}
              className="input-field"
            />
          </Label>
          {(selectedComp!.type === 'communication_converter' ||
            selectedComp!.type === 'iot_gateway' ||
            selectedComp!.type === 'cloud_monitoring_module' ||
            selectedComp!.type === 'energy_management_controller') && (
            <Label text="Endpoint port">
              <input
                type="number"
                value={
                  selectedComp!.properties.gatewayPort ??
                  (selectedComp!.type === 'iot_gateway'
                    ? 8883
                    : selectedComp!.type === 'cloud_monitoring_module'
                      ? 443
                      : selectedComp!.type === 'energy_management_controller'
                        ? 502
                      : 502)
                }
                onChange={(e) =>
                  updateProp({ gatewayPort: Math.max(1, Number(e.target.value) || 1) })
                }
                className="input-field"
                min={1}
                max={65535}
              />
            </Label>
          )}
        </>
      )}
      <Label
        text={
          selectedComp!.type === 'ethernet_switch'
            ? 'Ports'
            : selectedComp!.type === 'energy_management_controller'
              ? 'Managed points'
            : selectedComp!.type === 'modbus_rtu_module'
              ? 'RS485 drops'
              : 'Channels / ports'
        }
      >
        <input
          type="number"
          value={
            selectedComp!.properties.ioChannels ??
            (selectedComp!.type === 'ethernet_switch'
              ? 5
              : selectedComp!.type === 'energy_management_controller'
                ? 16
              : selectedComp!.type === 'modbus_rtu_module'
                ? 1
                : 8)
          }
          onChange={(e) =>
            updateProp({ ioChannels: Math.max(1, Number(e.target.value) || 1) })
          }
          className="input-field"
          min={1}
          max={64}
        />
      </Label>
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Use interface cards/converters/switches to isolate field devices and
        bridge BMS networks. Power terminals are optional and diagrammatic.
      </p>
    </>
  );

  const renderSignalIsolationProps = () => (
    <>
      <Label text="Channels">
        <input
          type="number"
          value={selectedComp!.properties.ioChannels ?? (selectedComp!.type === 'signal_isolator' ? 2 : 4)}
          onChange={(e) =>
            updateProp({ ioChannels: Math.max(1, Number(e.target.value) || 1) })
          }
          className="input-field"
          min={1}
          max={32}
        />
      </Label>
      {selectedComp!.type === 'signal_isolator' && (
        <Label text="Analog signal">
          <div className="flex gap-1">
            {(['0_10v', '4_20ma'] as const).map((sig) => (
              <button
                key={sig}
                type="button"
                onClick={() => updateProp({ aiSignalType: sig })}
                className={`px-2 py-1 rounded text-xs ${
                  (selectedComp!.properties.aiSignalType ?? '4_20ma') === sig
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {sig === '0_10v' ? '0-10V' : '4-20mA'}
              </button>
            ))}
          </div>
        </Label>
      )}
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Isolation modules break ground loops and protect BMS I/O from field-side
        transients and common-mode noise.
      </p>
    </>
  );

  const renderPowerAuxProps = () => (
    <>
      {(selectedComp!.type === 'ups_module' ||
        selectedComp!.type === 'dc_battery_backup' ||
        selectedComp!.type === 'motor_operator_kit' ||
        selectedComp!.type === 'shunt_trip_coil' ||
        selectedComp!.type === 'closing_coil' ||
        selectedComp!.type === 'uvr_release') && (
        <Label
          text={
            selectedComp!.type === 'ups_module'
              ? 'Output rating (A)'
              : selectedComp!.type === 'dc_battery_backup'
                ? 'Battery voltage (V)'
                : selectedComp!.type === 'motor_operator_kit'
                  ? 'Motor operator voltage (V)'
                  : selectedComp!.type === 'shunt_trip_coil'
                    ? 'Shunt trip coil voltage (V)'
                    : selectedComp!.type === 'closing_coil'
                      ? 'Closing coil voltage (V)'
                      : 'UVR hold voltage (V)'
          }
        >
          <input
            type="number"
            value={
              selectedComp!.type === 'ups_module'
                ? selectedComp!.properties.ratingAmps ?? 10
                : selectedComp!.type === 'dc_battery_backup'
                  ? selectedComp!.properties.voltage ?? 24
                  : selectedComp!.type === 'motor_operator_kit'
                    ? selectedComp!.properties.voltage ?? 230
                    : selectedComp!.properties.voltage ?? 24
            }
            onChange={(e) =>
              selectedComp!.type === 'ups_module'
                ? updateProp({ ratingAmps: Math.max(0, Number(e.target.value) || 0) })
                : updateProp({ voltage: Math.max(0, Number(e.target.value) || 0) })
            }
            className="input-field"
            min={0}
          />
        </Label>
      )}
      {selectedComp!.type === 'key_interlock' && (
        <Label text="Interlock state">
          <button
            type="button"
            onClick={() => toggleComponent(selectedComp!.id)}
            className={`w-full px-3 py-2 rounded text-xs font-semibold ${
              selectedComp!.state === 'on'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            {selectedComp!.state === 'on' ? 'Closed (key engaged)' : 'Open (key removed)'}
          </button>
        </Label>
      )}
      {selectedComp!.type === 'current_transformer' && (
        <Label text="CT primary /5A">
          <input
            type="number"
            value={selectedComp!.properties.meterCtPrimary ?? 100}
            onChange={(e) =>
              updateProp({ meterCtPrimary: Math.max(1, Number(e.target.value) || 1) })
            }
            className="input-field"
            min={1}
          />
        </Label>
      )}
      {selectedComp!.type === 'voltage_transformer' && (
        <>
          <Label text="Primary voltage (V)">
            <input
              type="number"
              value={selectedComp!.properties.phaseVoltage ?? 230}
              onChange={(e) =>
                updateProp({ phaseVoltage: Math.max(1, Number(e.target.value) || 1) })
              }
              className="input-field"
              min={1}
            />
          </Label>
          <Label text="Secondary voltage (V)">
            <input
              type="number"
              value={selectedComp!.properties.voltage ?? 110}
              onChange={(e) =>
                updateProp({ voltage: Math.max(1, Number(e.target.value) || 1) })
              }
              className="input-field"
              min={1}
            />
          </Label>
        </>
      )}
      {selectedComp!.type === 'power_quality_analyzer' && (
        <Label text="Protocol tag">
          <select
            value={selectedComp!.properties.meterProtocol ?? 'modbus_tcp'}
            onChange={(e) =>
              updateProp({ meterProtocol: e.target.value as ComponentProperties['meterProtocol'] })
            }
            className="input-field"
          >
            <option value="none">None</option>
            <option value="modbus_rtu">Modbus RTU</option>
            <option value="modbus_tcp">Modbus TCP</option>
            <option value="bacnet_ip">BACnet IP</option>
          </select>
        </Label>
      )}
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Auxiliary infrastructure components are mostly planning/documentation
        blocks, except key interlock which behaves as a series contact.
      </p>
    </>
  );

  const renderTerminalBlockProps = () => (
    <>
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Terminal block provides a simple pass-through from <strong>IN</strong>{' '}
        to <strong>OUT</strong>. Use it to keep wiring organized in panel
        schematics and marshalling layouts.
      </p>
    </>
  );

  const renderInterposingRelayProps = () => (
    <>
      <Label text="Coil voltage (V)">
        <div className="flex gap-1 flex-wrap">
          {[12, 24, 48, 110, 230].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() =>
                updateProp({
                  relayCoilVoltage: v,
                  relayCoilSupply:
                    v === 230 ? '230ac' : v === 110 ? '110dc' : '24dc',
                })
              }
              className={`px-2 py-1 rounded text-xs ${
                (selectedComp!.properties.relayCoilVoltage ?? 24) === v
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {v} V
            </button>
          ))}
        </div>
      </Label>
      <Label text="Coil supply (panel schedule)">
        <select
          value={selectedComp!.properties.relayCoilSupply ?? '24dc'}
          onChange={(e) =>
            updateProp({
              relayCoilSupply: e.target
                .value as ComponentProperties['relayCoilSupply'],
            })
          }
          className="input-field"
        >
          <option value="24dc">+24 V DC (typ. BMS)</option>
          <option value="110dc">+110 V DC</option>
          <option value="230ac">230 V AC</option>
        </select>
      </Label>
      <Label text="Contact rating (A)">
        <input
          type="number"
          value={selectedComp!.properties.ratingAmps ?? 6}
          onChange={(e) =>
            updateProp({
              ratingAmps: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className="input-field"
          min={0}
        />
      </Label>
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Coil A1/A2 picked up → IN/OUT NO contact closes. Use one between any
        BMS digital output and a contactor coil so the BMS never lands
        directly on a heavy AC coil.
      </p>
    </>
  );

  const renderAuxContactBlockProps = () => (
    <>
      <Label text="Contact rating (A)">
        <input
          type="number"
          value={selectedComp!.properties.ratingAmps ?? 10}
          onChange={(e) =>
            updateProp({
              ratingAmps: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className="input-field"
          min={0}
        />
      </Label>
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Auxiliary block has one NO pair <strong>13-14</strong> and one NC pair{' '}
        <strong>21-22</strong>. State <strong>on</strong> closes NO, while{' '}
        <strong>off</strong> closes NC.
      </p>
    </>
  );

  const renderEnergyMeterProps = () => (
    <>
      <Label text="Line voltage U_L-L">
        <div className="flex gap-1 flex-wrap">
          {[230, 400, 690].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => updateProp({ lineVoltage: v })}
              className={`px-2 py-1 rounded text-xs ${
                (selectedComp!.properties.lineVoltage ?? 400) === v
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {v} V
            </button>
          ))}
        </div>
      </Label>
      <Label text="CT primary (A)">
        <input
          type="number"
          value={selectedComp!.properties.meterCtPrimary ?? 100}
          onChange={(e) =>
            updateProp({
              meterCtPrimary: Math.max(1, Number(e.target.value) || 1),
            })
          }
          className="input-field"
          min={1}
        />
      </Label>
      <Label text="Field bus protocol">
        <select
          value={selectedComp!.properties.meterProtocol ?? 'modbus_rtu'}
          onChange={(e) =>
            updateProp({
              meterProtocol: e.target
                .value as ComponentProperties['meterProtocol'],
            })
          }
          className="input-field"
        >
          <option value="none">None</option>
          <option value="modbus_rtu">Modbus RTU (RS-485)</option>
          <option value="modbus_tcp">Modbus TCP</option>
          <option value="bacnet_ip">BACnet IP</option>
        </select>
      </Label>
      {(selectedComp!.properties.meterProtocol ?? 'modbus_rtu') !== 'none' && (
        <Label text="Address / Unit ID">
          <input
            type="number"
            value={selectedComp!.properties.meterCommAddress ?? 1}
            onChange={(e) =>
              updateProp({
                meterCommAddress: Math.max(0, Number(e.target.value) || 0),
              })
            }
            className="input-field"
            min={0}
            max={255}
          />
        </Label>
      )}
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Pass-through 3φ + N meter — wires straight through the bus. The
        display shows live U / I / kW from the simulator. CTs are clamped on
        each pole; their primary rating is documentation only.
      </p>
    </>
  );

  const renderMultimeterProps = () => (
    <>
      <Label text="Measurement mode">
        <div className="flex gap-1 flex-wrap">
          {[
            { v: 'voltage', l: 'Voltage (V)' },
            { v: 'current', l: 'Current (A)' },
            { v: 'continuity', l: 'Continuity (Buzzer)' },
          ].map((m) => (
            <button
              key={m.v}
              type="button"
              onClick={() =>
                updateProp({
                  multimeterMode: m.v as
                    | 'voltage'
                    | 'current'
                    | 'continuity',
                })
              }
              className={`px-2 py-1 rounded text-xs ${
                (selectedComp!.properties.multimeterMode ?? 'voltage') === m.v
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {m.l}
            </button>
          ))}
        </div>
      </Label>
      <Label text="Signal type">
        <div className="flex gap-1 flex-wrap">
          {[
            { v: 'auto', l: 'Auto' },
            { v: 'ac', l: 'AC' },
            { v: 'dc', l: 'DC' },
          ].map((s) => (
            <button
              key={s.v}
              type="button"
              onClick={() =>
                updateProp({
                  multimeterSignal: s.v as 'auto' | 'ac' | 'dc',
                })
              }
              className={`px-2 py-1 rounded text-xs ${
                ((selectedComp!.properties as { multimeterSignal?: 'auto' | 'ac' | 'dc' })
                  .multimeterSignal ?? 'auto') === s.v
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {s.l}
            </button>
          ))}
        </div>
      </Label>
      <Label text="High-voltage checks">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={selectedComp!.properties.multimeterHighVoltage !== false}
            onChange={(e) =>
              updateProp({ multimeterHighVoltage: e.target.checked })
            }
          />
          Enable HV indication
        </label>
      </Label>
      <Label text="Max HV range (V)">
        <input
          type="number"
          value={selectedComp!.properties.multimeterMaxVoltage ?? 1000}
          onChange={(e) =>
            updateProp({
              multimeterMaxVoltage: Math.max(
                100,
                Number(e.target.value) || 1000
              ),
            })
          }
          className="input-field"
          min={100}
          max={5000}
        />
      </Label>
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Two-probe DMM: wire <strong>COM</strong> and <strong>VΩA</strong> to
        test points. Continuity mode shows <strong>BEEP</strong> and lights the
        buzzer indicator when both probes are electrically continuous. Choose
        <strong> AC/DC</strong> signal type depending on the circuit under test.
      </p>
    </>
  );

  const renderTypeSpecificProps = () => {
    if (!selectedComp) return null;
    switch (selectedComp.type) {
      case 'switch':
        return renderSwitchProps();
      case 'push_button':
        return renderPushButtonProps();
      case 'mcb':
        return renderMCBProps('1p');
      case 'hrc_fuse':
      case 'control_circuit_fuse':
        return renderHrcFuseProps();
      case 'three_phase_mcb':
      case 'mccb':
      case 'four_phase_mcb':
        return renderMultipoleMcbProps();
      case 'motor_protection_circuit_breaker':
        return renderMpcbProps();
      case 'air_circuit_breaker':
        return renderAirCircuitBreakerProps();
      case 'motorized_mccb':
      case 'four_pole_motorized_mccb':
        return renderMotorizedMccbProps();
      case 'rcd':
      case 'residual_current_circuit_breaker':
        return renderRCDProps();
      case 'earth_leakage_relay_cbct':
        return renderEarthLeakageRelayCbctProps();
      case 'socket':
        return renderSocketProps();
      case 'lamp':
      case 'motor':
      case 'heater':
      case 'panel_heater':
      case 'cooling_fan':
      case 'generic_load':
        return renderLoadProps();
      case 'power_source':
        return renderPowerSourceProps();
      case 'dc_power_source':
        return renderDcPowerSourceProps();
      case 'ac_dc_converter':
        return renderAcDcConverterProps();
      case 'control_transformer':
        return renderControlTransformerProps();
      case 'modbus_tcp_gateway':
        return renderModbusTcpGatewayProps();
      case 'bacnet_ip_gateway':
        return renderBacnetIpGatewayProps();
      case 'di_module':
      case 'do_module':
      case 'ai_module':
      case 'ao_module':
        return renderBmsIOModuleProps();
      case 'relay_interface_card':
      case 'modbus_rtu_module':
      case 'communication_converter':
      case 'iot_gateway':
      case 'cloud_monitoring_module':
      case 'energy_management_controller':
      case 'ethernet_switch':
        return renderCommInfraProps();
      case 'signal_isolator':
      case 'optocoupler_module':
        return renderSignalIsolationProps();
      case 'ups_module':
      case 'dc_battery_backup':
      case 'motor_operator_kit':
      case 'shunt_trip_coil':
      case 'closing_coil':
      case 'uvr_release':
      case 'key_interlock':
      case 'neutral_link':
      case 'earth_link':
      case 'current_transformer':
      case 'voltage_transformer':
      case 'din_rail':
      case 'mounting_plate':
      case 'cable_duct':
      case 'busbar_support_insulator':
      case 'ferrule_cable_markers':
      case 'control_wiring':
      case 'power_cables':
      case 'ms_gi_sheet_enclosure':
      case 'ip_rated_enclosure':
      case 'power_quality_analyzer':
        return renderPowerAuxProps();
      case 'terminal_block':
        return renderTerminalBlockProps();
      case 'three_phase_source':
        return renderThreePhaseSourceProps();
      case 'three_phase_motor':
        return renderThreePhaseMotorProps();
      case 'three_phase_contactor':
      case 'four_phase_contactor':
        return renderThreePhaseContactorProps();
      case 'estop':
        return renderEStopProps();
      case 'door_interlock':
      case 'mechanical_interlock':
        return renderDoorInterlockProps();
      case 'selector_switch':
        return renderSelectorSwitchProps();
      case 'indicator_lamp':
        return renderIndicatorLampProps();
      case 'phase_indicator_bank':
        return renderPhaseIndicatorBankProps();
      case 'smps':
        return renderSmpsProps();
      case 'interposing_relay':
        return renderInterposingRelayProps();
      case 'aux_contact_block':
        return renderAuxContactBlockProps();
      case 'energy_meter':
      case 'digital_multifunction_meter':
        return renderEnergyMeterProps();
      case 'multimeter':
        return renderMultimeterProps();
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
            <Label text="Label text size">
              <input
                type="number"
                value={selectedComp.properties.labelFontSize ?? 9}
                onChange={(e) =>
                  updateProp({
                    labelFontSize: Math.min(
                      24,
                      Math.max(6, Number(e.target.value) || 9)
                    ),
                  })
                }
                className="input-field"
                min={6}
                max={24}
              />
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Label text="Label X offset">
                <input
                  type="number"
                  value={selectedComp.properties.labelOffsetX ?? 0}
                  onChange={(e) =>
                    updateProp({ labelOffsetX: Number(e.target.value) || 0 })
                  }
                  className="input-field"
                />
              </Label>
              <Label text="Label Y offset">
                <input
                  type="number"
                  value={selectedComp.properties.labelOffsetY ?? 0}
                  onChange={(e) =>
                    updateProp({ labelOffsetY: Number(e.target.value) || 0 })
                  }
                  className="input-field"
                />
              </Label>
            </div>

            <Label text="Type">
              <span className={`text-xs ${tc.textMuted} capitalize`}>
                {selectedComp.type.replace(/_/g, ' ')}
              </span>
            </Label>

            <Label text="Visual scale">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0.25}
                  max={4}
                  step={0.05}
                  value={selectedComp.scale ?? 1}
                  onChange={(e) =>
                    updateComponent(selectedComp.id, {
                      scale: clampComponentScale(Number(e.target.value)),
                    })
                  }
                  className="flex-1 min-w-0 accent-blue-600"
                />
                <span className={`text-xs font-mono w-11 shrink-0 ${tc.textMuted}`}>
                  {(selectedComp.scale ?? 1).toFixed(2)}×
                </span>
              </div>
            </Label>

            <Label text="Phase system">
              <select
                value={
                  (selectedComp.properties.phaseSystem ??
                    defaultPhaseSystemForType(selectedComp.type)) as PhaseSystem
                }
                onChange={(e) =>
                  setComponentPhaseSystem(
                    selectedComp.id,
                    e.target.value as PhaseSystem
                  )
                }
                className="input-field"
              >
                <option value="single_phase">Single-phase</option>
                <option value="three_phase">Three-phase</option>
              </select>
            </Label>
            <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
              Supply / MCB / contactor: switching phase may replace the symbol
              and remap L1/N (extra phase wires removed). Motors: with
              three-phase set, line current uses P/(√3·U<sub>L-L</sub>·PF); a
              1φ motor symbol uses ×1.25. A 3φ motor set to single-phase uses
              P/(U<sub>L-N</sub>·PF)·1.25.
            </p>

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
            {selectedComp && (
              <>
                <span className={tc.textMuted}>Phase (set):</span>
                <span>
                  {(selectedComp.properties.phaseSystem ??
                    defaultPhaseSystemForType(selectedComp.type)) ===
                  'three_phase'
                    ? 'Three-phase'
                    : 'Single-phase'}
                </span>
              </>
            )}
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
            {nodeResult.lineVoltageRmsV !== undefined && (
              <>
                <span className={tc.textMuted}>U_L-L:</span>
                <span>{nodeResult.lineVoltageRmsV.toFixed(1)}V</span>
              </>
            )}
            {nodeResult.phaseVoltageRmsV !== undefined && (
              <>
                <span className={tc.textMuted}>U_L-N:</span>
                <span>{nodeResult.phaseVoltageRmsV.toFixed(1)}V</span>
              </>
            )}
            {nodeResult.lineCurrentRmsA !== undefined && (
              <>
                <span className={tc.textMuted}>I_line:</span>
                <span>{nodeResult.lineCurrentRmsA.toFixed(2)}A</span>
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
            {selectedComp?.type === 'air_circuit_breaker' && (
              <>
                <span className={tc.textMuted}>ACB overload ∫:</span>
                <span>
                  {(selectedComp.acbSimState?.thermalExcess ?? 0).toFixed(1)} /{' '}
                  {selectedComp.properties.acbThermalTripIntegral ?? 80}
                </span>
                {(selectedComp.properties.acbBmsEnabled ?? false) &&
                  (() => {
                    const p = selectedComp.properties;
                    const trip = selectedComp.state === 'tripped';
                    const uvrOff = p.acbBmsUvrEnergized === false;
                    const aux52a =
                      !trip && selectedComp.state === 'on' && !uvrOff;
                    const aux52b =
                      selectedComp.state === 'off' || trip || uvrOff;
                    const proto = p.acbBmsProtocol ?? 'none';
                    return (
                      <>
                        <span className={tc.textMuted}>BMS 52a (closed):</span>
                        <span
                          className={
                            aux52a ? 'text-green-400 font-medium' : tc.textMuted
                          }
                        >
                          {aux52a ? 'HI' : 'LO'}
                        </span>
                        <span className={tc.textMuted}>BMS 52b (open):</span>
                        <span
                          className={
                            aux52b ? 'text-amber-400 font-medium' : tc.textMuted
                          }
                        >
                          {aux52b ? 'HI' : 'LO'}
                        </span>
                        <span className={tc.textMuted}>BMS TRIP:</span>
                        <span
                          className={
                            trip ? 'text-red-400 font-medium' : tc.textMuted
                          }
                        >
                          {trip ? 'HI' : 'LO'}
                        </span>
                        <span className={tc.textMuted}>BMS bus:</span>
                        <span className={tc.textMuted}>
                          {proto === 'none' ? '—' : proto.replace(/_/g, ' ')}
                        </span>
                      </>
                    );
                  })()}
              </>
            )}
            {(selectedComp?.type === 'motorized_mccb' ||
              selectedComp?.type === 'four_pole_motorized_mccb') &&
              (selectedComp.properties.mccbBmsEnabled ?? false) &&
              (() => {
                const p = selectedComp.properties;
                const trip = selectedComp.state === 'tripped';
                const interlockOpen =
                  p.mccbBmsCtrlVoltageOk === false ||
                  p.mccbBmsMotorReady === false;
                const closed =
                  selectedComp.state === 'on' && !trip && !interlockOpen;
                const auxNoHi = closed;
                const auxNcHi = !closed;
                const tripDiHi = trip;
                const proto = p.mccbBmsProtocol ?? 'none';
                return (
                  <>
                    <span className={tc.textMuted}>BMS AUX NO (closed):</span>
                    <span
                      className={
                        auxNoHi ? 'text-green-400 font-medium' : tc.textMuted
                      }
                    >
                      {auxNoHi ? 'HI' : 'LO'}
                    </span>
                    <span className={tc.textMuted}>BMS AUX NC:</span>
                    <span
                      className={
                        auxNcHi ? 'text-amber-400 font-medium' : tc.textMuted
                      }
                    >
                      {auxNcHi ? 'HI' : 'LO'}
                    </span>
                    <span className={tc.textMuted}>BMS TRIP:</span>
                    <span
                      className={
                        tripDiHi ? 'text-red-400 font-medium' : tc.textMuted
                      }
                    >
                      {tripDiHi ? 'HI' : 'LO'}
                    </span>
                    <span className={tc.textMuted}>BMS bus:</span>
                    <span className={tc.textMuted}>
                      {proto === 'none' ? '—' : proto.replace(/_/g, ' ')}
                    </span>
                  </>
                );
              })()}
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
