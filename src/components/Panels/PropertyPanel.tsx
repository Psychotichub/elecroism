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
    case 'three_phase_source':
    case 'three_phase_motor':
    case 'three_phase_mcb':
    case 'four_phase_mcb':
    case 'air_circuit_breaker':
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

  const renderMCBProps = (variant: '1p' | '3p' | '4p' = '1p') => (
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
      {(variant === '3p' || variant === '4p') && (
        <Label text="Poles">
          <span className={`text-xs ${tc.textMuted}`}>
            {variant === '4p' ? '4' : '3'} (fixed)
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
          {variant === '4p'
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

  const renderTypeSpecificProps = () => {
    if (!selectedComp) return null;
    switch (selectedComp.type) {
      case 'switch':
        return renderSwitchProps();
      case 'push_button':
        return renderPushButtonProps();
      case 'mcb':
        return renderMCBProps('1p');
      case 'three_phase_mcb':
      case 'four_phase_mcb':
        return renderMultipoleMcbProps();
      case 'air_circuit_breaker':
        return renderAirCircuitBreakerProps();
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
      case 'three_phase_source':
        return renderThreePhaseSourceProps();
      case 'three_phase_motor':
        return renderThreePhaseMotorProps();
      case 'three_phase_contactor':
      case 'four_phase_contactor':
        return renderThreePhaseContactorProps();
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
