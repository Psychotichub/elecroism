import React, { useMemo, useState } from 'react';
import type { CircuitComponent } from '../../types';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';

function isBmsDevice(
  c: CircuitComponent
): c is CircuitComponent & {
  type:
    | 'air_circuit_breaker'
    | 'motorized_mccb'
    | 'four_pole_motorized_mccb';
} {
  return (
    c.type === 'air_circuit_breaker' ||
    c.type === 'motorized_mccb' ||
    c.type === 'four_pole_motorized_mccb'
  );
}

function feedbackDot(active: boolean, okColor: string, badColor: string) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${
        active ? okColor : badColor
      }`}
      aria-hidden
    />
  );
}

const BmsSimulatorPanel: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const circuit = useCircuitStore((s) => s.circuit);
  const canvasSelectedId = useCircuitStore((s) => s.selectedId);
  const bmsSimLog = useCircuitStore((s) => s.bmsSimLog);
  const clearBmsSimLog = useCircuitStore((s) => s.clearBmsSimLog);
  const clearBmsSimLogForDevice = useCircuitStore(
    (s) => s.clearBmsSimLogForDevice
  );
  const updateComponent = useCircuitStore((s) => s.updateComponent);
  const acbBmsClosePulse = useCircuitStore((s) => s.acbBmsClosePulse);
  const acbBmsShuntOpen = useCircuitStore((s) => s.acbBmsShuntOpen);
  const mccbBmsMotorClosePulse = useCircuitStore(
    (s) => s.mccbBmsMotorClosePulse
  );
  const mccbBmsShuntOpen = useCircuitStore((s) => s.mccbBmsShuntOpen);

  const devices = useMemo(
    () => circuit.components.filter(isBmsDevice),
    [circuit.components]
  );

  /** Dropdown override when canvas selection is not a BMS device. */
  const [manualDeviceId, setManualDeviceId] = useState<string | null>(null);

  const deviceId = useMemo(() => {
    if (devices.length === 0) return '';
    if (
      canvasSelectedId &&
      devices.some((d) => d.id === canvasSelectedId)
    ) {
      return canvasSelectedId;
    }
    if (
      manualDeviceId &&
      devices.some((d) => d.id === manualDeviceId)
    ) {
      return manualDeviceId;
    }
    return devices[0].id;
  }, [devices, canvasSelectedId, manualDeviceId]);

  const comp = devices.find((d) => d.id === deviceId);

  const logForDevice = useMemo(
    () => bmsSimLog.filter((e) => e.deviceId === deviceId).slice(0, 14),
    [bmsSimLog, deviceId]
  );

  const btn =
    'rounded border px-2 py-1.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col overflow-hidden ${tc.panel} ${tc.text}`}
    >
      <div className={`shrink-0 border-b px-3 py-3 ${tc.border}`}>
        <h2 className={`text-sm font-bold ${tc.textBright}`}>
          BMS command simulator
        </h2>
        <p className={`mt-1 text-[11px] leading-snug ${tc.textMuted}`}>
          Drive the same BMS actions as the Properties panel. Command accept /
          reject reasons are logged so you can see why a breaker did or did not
          move. Undo and redo restore the log together with the schematic (each
          history step stores both).
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
        {devices.length === 0 ? (
          <p className={`text-xs ${tc.textMuted}`}>
            Add an ACB or motorized MCCB (3P or 4P) to simulate BMS commands.
          </p>
        ) : (
          <>
            <div>
              <label
                htmlFor="bms-sim-device"
                className={`mb-1 block text-[10px] font-semibold uppercase tracking-wide ${tc.textMuted}`}
              >
                Device
              </label>
              <select
                id="bms-sim-device"
                value={deviceId}
                onChange={(e) => setManualDeviceId(e.target.value)}
                className="input-field w-full py-1.5 text-xs"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label} ({d.type.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
            </div>

            {comp && (
              <>
                {comp.type === 'air_circuit_breaker' &&
                !comp.properties.acbBmsEnabled ? (
                  <p
                    className={`rounded border border-amber-600/50 bg-amber-950/40 px-2 py-1.5 text-[10px] leading-snug text-amber-200/90`}
                  >
                    BMS is disabled on this ACB — commands will be rejected
                    until you enable BMS in Properties.
                  </p>
                ) : null}
                {(comp.type === 'motorized_mccb' ||
                  comp.type === 'four_pole_motorized_mccb') &&
                !comp.properties.mccbBmsEnabled ? (
                  <p
                    className={`rounded border border-amber-600/50 bg-amber-950/40 px-2 py-1.5 text-[10px] leading-snug text-amber-200/90`}
                  >
                    BMS is disabled on this MCCB — enable BMS in Properties to
                    accept motor / shunt commands.
                  </p>
                ) : null}

                <div>
                  <h3
                    className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wide ${tc.textMuted}`}
                  >
                    Commands
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {comp.type === 'air_circuit_breaker' ? (
                      <>
                        <button
                          type="button"
                          className={`${btn} ${tc.border} border-blue-500/60 bg-blue-600/25 text-blue-100 hover:bg-blue-600/35`}
                          onClick={() => acbBmsClosePulse(comp.id)}
                        >
                          ACB close (CC)
                        </button>
                        <button
                          type="button"
                          className={`${btn} ${tc.border} border-rose-500/50 bg-rose-900/30 text-rose-100 hover:bg-rose-900/45`}
                          onClick={() => acbBmsShuntOpen(comp.id)}
                        >
                          ACB shunt trip
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={`${btn} ${tc.border} border-blue-500/60 bg-blue-600/25 text-blue-100 hover:bg-blue-600/35`}
                          onClick={() => mccbBmsMotorClosePulse(comp.id)}
                        >
                          mMCCB motor close
                        </button>
                        <button
                          type="button"
                          className={`${btn} ${tc.border} border-rose-500/50 bg-rose-900/30 text-rose-100 hover:bg-rose-900/45`}
                          onClick={() => mccbBmsShuntOpen(comp.id)}
                        >
                          mMCCB shunt open
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <h3
                    className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wide ${tc.textMuted}`}
                  >
                    Simulated interlocks
                  </h3>
                  <div className="flex flex-col gap-2">
                    {comp.type === 'air_circuit_breaker' ? (
                      <>
                        <label className="flex cursor-pointer items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            className="rounded border border-zinc-500"
                            checked={comp.properties.acbBmsUvrEnergized !== false}
                            onChange={(e) =>
                              updateComponent(comp.id, {
                                properties: {
                                  ...comp.properties,
                                  acbBmsUvrEnergized: e.target.checked,
                                },
                              })
                            }
                          />
                          UVR energized
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            className="rounded border border-zinc-500"
                            checked={
                              comp.properties.acbBmsSpringCharged !== false
                            }
                            onChange={(e) =>
                              updateComponent(comp.id, {
                                properties: {
                                  ...comp.properties,
                                  acbBmsSpringCharged: e.target.checked,
                                },
                              })
                            }
                          />
                          Spring charged
                        </label>
                      </>
                    ) : (
                      <>
                        <label className="flex cursor-pointer items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            className="rounded border border-zinc-500"
                            checked={
                              comp.properties.mccbBmsCtrlVoltageOk !== false
                            }
                            onChange={(e) =>
                              updateComponent(comp.id, {
                                properties: {
                                  ...comp.properties,
                                  mccbBmsCtrlVoltageOk: e.target.checked,
                                },
                              })
                            }
                          />
                          Control voltage OK
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            className="rounded border border-zinc-500"
                            checked={
                              comp.properties.mccbBmsMotorReady !== false
                            }
                            onChange={(e) =>
                              updateComponent(comp.id, {
                                properties: {
                                  ...comp.properties,
                                  mccbBmsMotorReady: e.target.checked,
                                },
                              })
                            }
                          />
                          Motor ready
                        </label>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <h3
                    className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wide ${tc.textMuted}`}
                  >
                    Feedback (derived)
                  </h3>
                  <ul className="space-y-1.5 text-[11px]">
                    {comp.type === 'air_circuit_breaker' ? (
                      <>
                        <li className="flex items-center justify-between gap-2">
                          <span>52a (closed)</span>
                          <span className="flex items-center gap-1.5">
                            {feedbackDot(
                              comp.state === 'on',
                              'bg-emerald-400',
                              'bg-zinc-600'
                            )}
                            {comp.state === 'on' ? 'ON' : 'OFF'}
                            {comp.properties.acbBmsDi52aTag ? (
                              <span className={`${tc.textMuted}`}>
                                ({comp.properties.acbBmsDi52aTag})
                              </span>
                            ) : null}
                          </span>
                        </li>
                        <li className="flex items-center justify-between gap-2">
                          <span>52b (open)</span>
                          <span className="flex items-center gap-1.5">
                            {feedbackDot(
                              comp.state === 'off',
                              'bg-emerald-400',
                              'bg-zinc-600'
                            )}
                            {comp.state === 'off' ? 'ON' : 'OFF'}
                            {comp.properties.acbBmsDi52bTag ? (
                              <span className={`${tc.textMuted}`}>
                                ({comp.properties.acbBmsDi52bTag})
                              </span>
                            ) : null}
                          </span>
                        </li>
                        <li className="flex items-center justify-between gap-2">
                          <span>Trip alarm</span>
                          <span className="flex items-center gap-1.5">
                            {feedbackDot(
                              comp.state === 'tripped',
                              'bg-rose-400',
                              'bg-zinc-600'
                            )}
                            {comp.state === 'tripped' ? 'ACTIVE' : 'clear'}
                            {comp.properties.acbBmsDiTripTag ? (
                              <span className={`${tc.textMuted}`}>
                                ({comp.properties.acbBmsDiTripTag})
                              </span>
                            ) : null}
                          </span>
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-center justify-between gap-2">
                          <span>Aux NO (closed)</span>
                          <span className="flex items-center gap-1.5">
                            {feedbackDot(
                              comp.state === 'on',
                              'bg-emerald-400',
                              'bg-zinc-600'
                            )}
                            {comp.state === 'on' ? 'ON' : 'OFF'}
                            {comp.properties.mccbBmsDiAuxNoTag ? (
                              <span className={`${tc.textMuted}`}>
                                ({comp.properties.mccbBmsDiAuxNoTag})
                              </span>
                            ) : null}
                          </span>
                        </li>
                        <li className="flex items-center justify-between gap-2">
                          <span>Aux NC (open)</span>
                          <span className="flex items-center gap-1.5">
                            {feedbackDot(
                              comp.state === 'off',
                              'bg-emerald-400',
                              'bg-zinc-600'
                            )}
                            {comp.state === 'off' ? 'ON' : 'OFF'}
                            {comp.properties.mccbBmsDiAuxNcTag ? (
                              <span className={`${tc.textMuted}`}>
                                ({comp.properties.mccbBmsDiAuxNcTag})
                              </span>
                            ) : null}
                          </span>
                        </li>
                        <li className="flex items-center justify-between gap-2">
                          <span>Trip alarm</span>
                          <span className="flex items-center gap-1.5">
                            {feedbackDot(
                              comp.state === 'tripped',
                              'bg-rose-400',
                              'bg-zinc-600'
                            )}
                            {comp.state === 'tripped' ? 'ACTIVE' : 'clear'}
                            {comp.properties.mccbBmsDiTripTag ? (
                              <span className={`${tc.textMuted}`}>
                                ({comp.properties.mccbBmsDiTripTag})
                              </span>
                            ) : null}
                          </span>
                        </li>
                      </>
                    )}
                    <li className={`border-t pt-1.5 ${tc.border} ${tc.textMuted}`}>
                      Main state:{' '}
                      <span className={`font-mono ${tc.textBright}`}>
                        {comp.state}
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="min-h-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <h3
                      className={`text-[10px] font-semibold uppercase tracking-wide ${tc.textMuted}`}
                    >
                      Command log ({comp.label})
                    </h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      <button
                        type="button"
                        onClick={() => clearBmsSimLogForDevice(comp.id)}
                        className={`text-[10px] font-semibold underline-offset-2 hover:underline ${tc.textMuted}`}
                      >
                        Clear this device
                      </button>
                      <button
                        type="button"
                        onClick={() => clearBmsSimLog()}
                        className={`text-[10px] font-semibold underline-offset-2 hover:underline ${tc.textMuted}`}
                      >
                        Clear all
                      </button>
                    </div>
                  </div>
                  {logForDevice.length === 0 ? (
                    <p className={`text-[10px] ${tc.textMuted}`}>
                      No commands for this device yet.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 font-mono text-[10px] leading-snug">
                      {logForDevice.map((e) => (
                        <li
                          key={e.id}
                          className={`rounded border px-2 py-1 ${tc.border} ${
                            e.ok
                              ? 'border-emerald-700/40 bg-emerald-950/25'
                              : 'border-rose-700/40 bg-rose-950/25'
                          }`}
                        >
                          <div className="flex justify-between gap-2">
                            <span className="font-semibold text-zinc-200">
                              {e.command}
                            </span>
                            <span
                              className={
                                e.ok ? 'text-emerald-300' : 'text-rose-300'
                              }
                            >
                              {e.ok ? 'OK' : 'reject'}
                            </span>
                          </div>
                          <div className="mt-0.5 text-zinc-400">{e.detail}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BmsSimulatorPanel;
