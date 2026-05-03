import React from 'react';
import { usePPCtx } from '../PropertyPanelContext';
import { Label } from '../PropertyPanelLabel';

export const renderMCBProps = (
    variant: '1p' | '3p' | '4p' | 'motorized_mccb' | 'motorized_mccb_4p' = '1p'
// eslint-disable-next-line react-hooks/rules-of-hooks
  ) => { const { selectedComp, tc, updateProp, setMcbPoleLayout, resetTripped } = usePPCtx(); return (
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
  )};

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderHrcFuseProps = () => { const { selectedComp, tc, updateProp, toggleComponent, updateComponent, resetTripped } = usePPCtx(); return (
    <>
      {selectedComp!.type === 'hrc_fuse' && (
        <Label text="Poles">
          <div className="flex gap-1">
            {([1, 3] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  const points =
                    p === 3
                      ? [
                          { x: -20, y: -25, label: '1' },
                          { x: -20, y: 25, label: '2' },
                          { x: 0, y: -25, label: '3' },
                          { x: 0, y: 25, label: '4' },
                          { x: 20, y: -25, label: '5' },
                          { x: 20, y: 25, label: '6' },
                        ]
                      : [
                          { x: 0, y: -25, label: '1' },
                          { x: 0, y: 25, label: '2' },
                        ];
                  updateComponent(selectedComp!.id, {
                    properties: {
                      ...selectedComp!.properties,
                      poles: p,
                      phaseSystem: p === 3 ? 'three_phase' : 'single_phase',
                    },
                    connectionPoints: points.map((pt) => ({
                      id: crypto.randomUUID(),
                      componentId: selectedComp!.id,
                      x: pt.x,
                      y: pt.y,
                      label: pt.label,
                    })),
                  });
                }}
                className={`px-2 py-1 rounded text-xs ${
                  (selectedComp!.properties.poles ?? 1) === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {p}P
              </button>
            ))}
          </div>
        </Label>
      )}
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
      {selectedComp!.type === 'hrc_fuse' && (
        <>
          <Label text="HRC class">
            <select
              value={selectedComp!.properties.hrcType ?? 'gG'}
              onChange={(e) =>
                updateProp({
                  hrcType: e.target.value as 'gG' | 'gL' | 'aM' | 'aR' | 'gR',
                })
              }
              className="input-field"
            >
              <option value="gG">gG (general purpose)</option>
              <option value="gL">gL (distribution)</option>
              <option value="aM">aM (motor short-circuit)</option>
              <option value="aR">aR (semiconductor fast)</option>
              <option value="gR">gR (semiconductor full-range)</option>
            </select>
          </Label>
          <Label text="HRC breaking capacity (kA)">
            <input
              type="number"
              value={selectedComp!.properties.hrcBreakingCapacityKa ?? 80}
              onChange={(e) =>
                updateProp({
                  hrcBreakingCapacityKa: Math.max(10, Number(e.target.value) || 10),
                })
              }
              className="input-field"
              min={10}
              max={200}
            />
          </Label>
          <Label text="Fusing factor">
            <input
              type="number"
              step={0.01}
              value={selectedComp!.properties.hrcFusingFactor ?? 1.6}
              onChange={(e) =>
                updateProp({
                  hrcFusingFactor: Math.max(1.1, Number(e.target.value) || 1.1),
                })
              }
              className="input-field"
              min={1.1}
              max={3}
            />
          </Label>
          <Label text="I²t let-through (A²s)">
            <input
              type="number"
              value={selectedComp!.properties.hrcI2tA2s ?? 12000}
              onChange={(e) =>
                updateProp({ hrcI2tA2s: Math.max(1, Number(e.target.value) || 1) })
              }
              className="input-field"
              min={1}
            />
          </Label>
        </>
      )}
      {selectedComp!.type === 'control_circuit_fuse' && (
        <>
          <Label text="Control supply source">
            <select
              value={
                selectedComp!.properties.controlCircuitSupplyMode ?? 'single_phase_ln'
              }
              onChange={(e) =>
                updateProp({
                  controlCircuitSupplyMode: e.target.value as
                    | 'single_phase_ln'
                    | 'derived_from_3ph_ll'
                    | 'monitoring_3ph',
                  phaseSystem:
                    e.target.value === 'monitoring_3ph'
                      ? 'three_phase'
                      : 'single_phase',
                })
              }
              className="input-field"
            >
              <option value="single_phase_ln">Single-phase (L-N)</option>
              <option value="derived_from_3ph_ll">Derived from 3-phase (L-L)</option>
              <option value="monitoring_3ph">True 3-phase monitoring</option>
            </select>
          </Label>
          <Label text="Control voltage">
            <div className="flex gap-1">
              {([24, 110, 230] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => updateProp({ controlCircuitVoltage: v })}
                  className={`px-2 py-1 rounded text-xs ${
                    (selectedComp!.properties.controlCircuitVoltage ?? 230) === v
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
            In most panels control is single-phase (direct L-N or derived from
            3-phase via L-L/transformer). True 3-phase control is typically for
            phase-monitoring/protection relays.
          </p>
        </>
      )}
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
  )};

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderRCDProps = () => { const { selectedComp, tc, updateProp, updateComponent, resetTripped } = usePPCtx(); return (
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
            updateProp({
              rcdSensitivity: Number(e.target.value) as 10 | 30 | 100 | 300,
            })
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
      <Label text="RCD type">
        <select
          value={selectedComp!.properties.rcdType ?? 'A'}
          onChange={(e) =>
            updateProp({ rcdType: e.target.value as 'AC' | 'A' | 'B' })
          }
          className="input-field"
        >
          <option value="AC">Type AC (AC only)</option>
          <option value="A">Type A (AC + pulsating DC)</option>
          <option value="B">Type B (AC + DC + HF)</option>
        </select>
      </Label>
      <Label text="Trip time">
        <select
          value={selectedComp!.properties.rcdTripTimeMs ?? 30}
          onChange={(e) =>
            updateProp({ rcdTripTimeMs: Math.max(1, Number(e.target.value) || 1) })
          }
          className="input-field"
        >
          {[10, 30, 100, 300].map((t) => (
            <option key={t} value={t}>
              {t} ms
            </option>
          ))}
        </select>
      </Label>
      <Label text="Poles">
        <div className="flex gap-1">
          {[2, 4].map((p) => (
            <button
              key={p}
              onClick={() => {
                const points =
                  p === 4
                    ? [
                        { x: -30, y: -25, label: '1' },
                        { x: -30, y: 25, label: '2' },
                        { x: -10, y: -25, label: '3' },
                        { x: -10, y: 25, label: '4' },
                        { x: 10, y: -25, label: '5' },
                        { x: 10, y: 25, label: '6' },
                        { x: 30, y: -25, label: '7' },
                        { x: 30, y: 25, label: '8' },
                      ]
                    : [
                        { x: -10, y: -25, label: '1' },
                        { x: -10, y: 25, label: '2' },
                        { x: 10, y: -25, label: '3' },
                        { x: 10, y: 25, label: '4' },
                      ];
                updateComponent(selectedComp!.id, {
                  properties: {
                    ...selectedComp!.properties,
                    poles: p,
                    phaseSystem: p === 4 ? 'three_phase' : 'single_phase',
                  },
                  connectionPoints: points.map((pt) => ({
                    id: crypto.randomUUID(),
                    componentId: selectedComp!.id,
                    x: pt.x,
                    y: pt.y,
                    label: pt.label,
                  })),
                });
              }}
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
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        RCD compares line and neutral current continuously. Leakage imbalance
        above setting trips quickly for shock/fire protection. Terminals follow
        odd-in / even-out numbering: 2P uses <strong>1–4</strong> (line pair then
        neutral pair); 4P uses <strong>1–8</strong> (L1–L3 pairs then{' '}
        <strong>7–8</strong> for N).
      </p>
      {selectedComp!.type === 'hrc_fuse' && (
        <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
          HRC fuse is a one-time high-speed fault interrupter. Select class and
          rupturing capacity above prospective short-circuit current for safe
          discrimination and cable/device protection.
        </p>
      )}
    </>
  )};

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderMpcbProps = () => { const { selectedComp, tc, updateProp, toggleComponent, resetTripped } = usePPCtx(); return (
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
  )};

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderEarthLeakageRelayCbctProps = () => { const { selectedComp, tc, updateProp, toggleComponent, updateComponent, resetTripped } = usePPCtx(); return (
    <>
      <Label text="Application">
        <div className="flex gap-1">
          {([1, 3] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                const points =
                  p === 3
                    ? [
                        { x: -20, y: -25, label: '1' },
                        { x: -20, y: 25, label: '2' },
                        { x: 0, y: -25, label: '3' },
                        { x: 0, y: 25, label: '4' },
                        { x: 20, y: -25, label: '5' },
                        { x: 20, y: 25, label: '6' },
                      ]
                    : [
                        { x: 0, y: -25, label: '1' },
                        { x: 0, y: 25, label: '2' },
                      ];
                updateComponent(selectedComp!.id, {
                  properties: {
                    ...selectedComp!.properties,
                    poles: p,
                    phaseSystem: p === 3 ? 'three_phase' : 'single_phase',
                  },
                  connectionPoints: points.map((pt) => ({
                    id: crypto.randomUUID(),
                    componentId: selectedComp!.id,
                    x: pt.x,
                    y: pt.y,
                    label: pt.label,
                  })),
                });
              }}
              className={`px-2 py-1 rounded text-xs ${
                (selectedComp!.properties.poles ?? 1) === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {p === 3 ? '3-phase (L1/L2/L3)' : 'Single-phase (L/N)'}
            </button>
          ))}
        </div>
      </Label>
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
      <Label text="Trip delay">
        <select
          value={selectedComp!.properties.elrTripDelayMs ?? 0}
          onChange={(e) =>
            updateProp({ elrTripDelayMs: Math.max(0, Number(e.target.value) || 0) })
          }
          className="input-field"
        >
          {[0, 100, 300, 500, 1000].map((d) => (
            <option key={d} value={d}>
              {d === 0 ? 'Instantaneous' : `${d} ms`}
            </option>
          ))}
        </select>
      </Label>
      <Label text="State">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => {
              if (selectedComp!.state !== 'on') toggleComponent(selectedComp!.id);
            }}
            className={`flex-1 px-2 py-1 rounded text-xs font-medium ${
              selectedComp!.state === 'on'
                ? 'bg-green-600 text-white'
                : 'bg-gray-600 text-gray-300'
            }`}
          >
            ON (Armed)
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedComp!.state === 'on') toggleComponent(selectedComp!.id);
            }}
            className={`flex-1 px-2 py-1 rounded text-xs font-medium ${
              selectedComp!.state !== 'on'
                ? 'bg-red-600 text-white'
                : 'bg-gray-600 text-gray-300'
            }`}
          >
            OFF (Isolated)
          </button>
        </div>
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
        feeder leakage protection where an RCD is not preferred. Pass all active
        conductors through CBCT core (L/N or L1/L2/L3), never earth conductor.
      </p>
    </>
  )};

