import { usePPCtx } from '../PropertyPanelContext';
import { Label } from '../PropertyPanelLabel';
import type { ComponentProperties } from '../../../../types';
import PqaLiveReadings from './PqaLiveReadings';

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderEnergyMeterProps = () => { const { selectedComp, tc, updateProp } = usePPCtx(); return (
    <>
      <Label text="Line voltage U_L-L">
        <div className="flex gap-1 flex-wrap">
          {[230, 400, 690].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => updateProp({ lineVoltage: v })}
              className={`px-2 py-1 rounded es-typo-body ${
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
      <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
        Pass-through 3φ + N meter — wires straight through the bus. The
        display shows live U / I / kW from the simulator. CTs are clamped on
        each pole; their primary rating is documentation only.
      </p>
    </>
  )};

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderMultimeterProps = () => { const { selectedComp, tc, updateProp } = usePPCtx(); return (
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
              className={`px-2 py-1 rounded es-typo-body ${
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
              className={`px-2 py-1 rounded es-typo-body ${
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
        <label className="flex items-center gap-2 es-typo-body">
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
      <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
        Two-probe DMM: wire <strong>COM</strong> and <strong>VΩA</strong> to
        test points. Continuity mode shows <strong>BEEP</strong> and lights the
        buzzer indicator when both probes are electrically continuous. Choose
        <strong> AC/DC</strong> signal type depending on the circuit under test.
      </p>
    </>
  )};

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderPowerAuxProps = () => { const { selectedComp, tc, updateProp, toggleComponent } = usePPCtx(); return (
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
      {selectedComp!.type === 'dc_battery_backup' && (
        <>
          <Label text="Battery capacity (Ah)">
            <input
              type="number"
              value={selectedComp!.properties.batteryCapacityAh ?? 7}
              onChange={(e) =>
                updateProp({
                  batteryCapacityAh: Math.max(1, Number(e.target.value) || 1),
                })
              }
              className="input-field"
              min={1}
            />
          </Label>
          <Label text="Remaining charge (Ah)">
            <input
              type="number"
              value={
                selectedComp!.properties.batteryRemainingAh ??
                selectedComp!.properties.batteryCapacityAh ??
                7
              }
              onChange={(e) =>
                updateProp({
                  batteryRemainingAh: Math.max(
                    0,
                    Number(e.target.value) || 0
                  ),
                })
              }
              className="input-field"
              min={0}
              step={0.1}
            />
          </Label>
          <Label text="Inverter cutoff (%)">
            <input
              type="number"
              value={selectedComp!.properties.batteryCutoffPercent ?? 15}
              onChange={(e) =>
                updateProp({
                  batteryCutoffPercent: Math.min(
                    50,
                    Math.max(5, Number(e.target.value) || 15)
                  ),
                })
              }
              className="input-field"
              min={5}
              max={50}
            />
          </Label>
        </>
      )}
      {selectedComp!.type === 'ups_module' && (
        <>
          <Label text="Static bypass">
            <button
              type="button"
              onClick={() =>
                updateProp({
                  upsStaticBypass: !selectedComp!.properties.upsStaticBypass,
                })
              }
              className={`w-full px-3 py-2 rounded es-typo-body font-semibold ${
                selectedComp!.properties.upsStaticBypass
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              {selectedComp!.properties.upsStaticBypass ? 'Enabled' : 'Disabled'}
            </button>
          </Label>
          <Label text="Battery inverter">
            <button
              type="button"
              onClick={() =>
                updateProp({
                  upsInverterEnabled:
                    selectedComp!.properties.upsInverterEnabled === false,
                })
              }
              className={`w-full px-3 py-2 rounded es-typo-body font-semibold ${
                selectedComp!.properties.upsInverterEnabled !== false
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              {selectedComp!.properties.upsInverterEnabled !== false
                ? 'Enabled'
                : 'Disabled'}
            </button>
          </Label>
          <Label text="Float charge current (A)">
            <input
              type="number"
              value={selectedComp!.properties.upsChargeCurrentA ?? 2}
              onChange={(e) =>
                updateProp({
                  upsChargeCurrentA: Math.max(0.1, Number(e.target.value) || 2),
                })
              }
              className="input-field"
              min={0.1}
              step={0.1}
            />
          </Label>
          <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
            On inverter backup, battery Ah depletes with load current. When AC
            mains returns, float charge current is drawn on the AC input. Below
            cutoff SoC the UPS trips and drops the output.
          </p>
        </>
      )}
      {selectedComp!.type === 'key_interlock' && (
        <Label text="Interlock state">
          <button
            type="button"
            onClick={() => toggleComponent(selectedComp!.id)}
            className={`w-full px-3 py-2 rounded es-typo-body font-semibold ${
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
        <>
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
          <PqaLiveReadings />
        </>
      )}
      <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
        Auxiliary infrastructure components are mostly planning/documentation
        blocks, except key interlock which behaves as a series contact.
      </p>
    </>
  )};

