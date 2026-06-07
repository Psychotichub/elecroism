import { usePPCtx } from '../PropertyPanelContext';
import { Label } from '../PropertyPanelLabel';
import type { ComponentProperties } from '../../../../types';
import { renderMCBProps } from './ProtectionEditors';
import { AddIdenticalFeederButton } from './FeederEditors';

export const renderMultipoleMcbProps = () => {
// eslint-disable-next-line react-hooks/rules-of-hooks
    const { selectedComp, updateProp } = usePPCtx();
    if (!selectedComp) return null;
    const variant =
      selectedComp.type === 'four_phase_mcb' ? '4p' : '3p';
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
                (selectedComp.properties.lineVoltage ?? 400) === v
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {v}V
            </button>
          ))}
        </div>
      </Label>
      <AddIdenticalFeederButton />
    </>
    );
};

export const renderMotorizedMccbProps = () => {
// eslint-disable-next-line react-hooks/rules-of-hooks
    const { selectedComp, updateProp, updateComponent, tc, mccbBmsMotorClosePulse, mccbBmsShuntOpen } = usePPCtx();
    if (!selectedComp) return null;
    const mccbVariant =
      selectedComp.type === 'four_pole_motorized_mccb'
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
                (selectedComp.properties.lineVoltage ?? 400) === v
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
          Wire the <strong>power</strong> poles (1–6) like a 3P MCB.
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
              checked={selectedComp.properties.mccbBmsEnabled ?? false}
              onChange={(e) =>
                updateProp({ mccbBmsEnabled: e.target.checked })
              }
            />
            <span className={tc.textMuted}>Remote motor + shunt (BMS/PLC)</span>
          </label>
        </Label>
        {(selectedComp.properties.mccbBmsEnabled ?? false) && (
          <>
            <Label text="Field bus (supervision)">
              <select
                value={selectedComp.properties.mccbBmsProtocol ?? 'none'}
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
                    selectedComp.properties.mccbBmsCtrlVoltageOk !== false
                  }
                  onChange={(e) => {
                    const c = selectedComp;
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
                    selectedComp.properties.mccbBmsMotorReady !== false
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
                onClick={() => mccbBmsMotorClosePulse(selectedComp.id)}
                className="w-full px-2 py-1.5 rounded text-xs font-medium bg-emerald-700 text-white hover:bg-emerald-600"
              >
                BMS DO — motor close (remote ON)
              </button>
              <button
                type="button"
                onClick={() => mccbBmsShuntOpen(selectedComp.id)}
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
                  value={selectedComp.properties.mccbCtrlSupply ?? '24dc'}
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
                      selectedComp.properties.mccbCtrlFuseDesignation ?? 'F1'
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
                      selectedComp.properties.mccbCtrlFuseAmps ?? 2
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
                    value={selectedComp.properties.mccbRelayMotorId ?? 'K1'}
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
                    value={selectedComp.properties.mccbRelayStId ?? 'K2'}
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
                        selectedComp.properties.mccbBmsDoMotorTag ??
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
                        selectedComp.properties.mccbBmsDoShuntTag ?? 'DO-ST'
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
                        selectedComp.properties.mccbBmsDiAuxNoTag ??
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
                        selectedComp.properties.mccbBmsDiAuxNcTag ??
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
                        selectedComp.properties.mccbBmsDiTripTag ??
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
                const pr = selectedComp.properties;
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

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderAirCircuitBreakerProps = () => { const { selectedComp, tc, updateProp, updateComponent, acbBmsClosePulse, acbBmsShuntOpen, resetTripped } = usePPCtx(); return (
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
          Main power stays on the pole terminals (1–8). BMS control uses
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
  );};

