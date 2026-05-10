import { usePPCtx } from '../PropertyPanelContext';
import { Label } from '../PropertyPanelLabel';
import type { ComponentProperties } from '../../../../types';
import { defaultPhaseSystemForType } from '../constants';

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderPhaseCurrentUnbalanceFields = () => { const { selectedComp, tc, updateProp } = usePPCtx();
    if (!selectedComp) return null;
    const ps =
      selectedComp.properties.phaseSystem ??
      defaultPhaseSystemForType(selectedComp.type);
    const show =
      (selectedComp.type === 'three_phase_motor' && ps !== 'single_phase') ||
      (selectedComp.type === 'motor' && ps === 'three_phase');
    if (!show) return null;
    const f1 = selectedComp.properties.threePhaseCurrentFactorL1 ?? 1;
    const f2 = selectedComp.properties.threePhaseCurrentFactorL2 ?? 1;
    const f3 = selectedComp.properties.threePhaseCurrentFactorL3 ?? 1;
    return (
      <div className={`rounded-md border p-2.5 space-y-2 ${tc.border}`}>
        <p className={`text-[10px] font-semibold ${tc.textBright}`}>
          Phase detail (optional)
        </p>
        <p className={`text-[10px] leading-snug ${tc.textMuted}`}>
          Set per-phase power (W) for a 4-wire board model (overrides total
          powerWatts for line currents). Otherwise current factors keep mean = 1.
          Per-phase PF sets angle vs voltage for I_N. Voltage factors scale L–N
          (mean 1); L–L follows from 120° phasors.
        </p>
        <p className={`text-[9px] font-medium ${tc.textMuted}`}>Per-phase power (W)</p>
        <Label text="P_L1">
          <input
            type="number"
            min={0}
            step={10}
            value={
              selectedComp.properties.powerWattsL1 === undefined
                ? ''
                : selectedComp.properties.powerWattsL1
            }
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                updateProp({ powerWattsL1: undefined });
                return;
              }
              updateProp({ powerWattsL1: Math.max(0, Number(raw) || 0) });
            }}
            placeholder="blank = use factors / total P"
            className="input-field"
          />
        </Label>
        <Label text="P_L2">
          <input
            type="number"
            min={0}
            step={10}
            value={
              selectedComp.properties.powerWattsL2 === undefined
                ? ''
                : selectedComp.properties.powerWattsL2
            }
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                updateProp({ powerWattsL2: undefined });
                return;
              }
              updateProp({ powerWattsL2: Math.max(0, Number(raw) || 0) });
            }}
            className="input-field"
          />
        </Label>
        <Label text="P_L3">
          <input
            type="number"
            min={0}
            step={10}
            value={
              selectedComp.properties.powerWattsL3 === undefined
                ? ''
                : selectedComp.properties.powerWattsL3
            }
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                updateProp({ powerWattsL3: undefined });
                return;
              }
              updateProp({ powerWattsL3: Math.max(0, Number(raw) || 0) });
            }}
            className="input-field"
          />
        </Label>
        <Label text="Factor L1">
          <input
            type="number"
            step={0.05}
            min={0.05}
            max={3}
            value={f1}
            onChange={(e) =>
              updateProp({
                threePhaseCurrentFactorL1: Math.min(
                  3,
                  Math.max(0.05, Number(e.target.value) || 1)
                ),
              })
            }
            className="input-field"
          />
        </Label>
        <Label text="Factor L2">
          <input
            type="number"
            step={0.05}
            min={0.05}
            max={3}
            value={f2}
            onChange={(e) =>
              updateProp({
                threePhaseCurrentFactorL2: Math.min(
                  3,
                  Math.max(0.05, Number(e.target.value) || 1)
                ),
              })
            }
            className="input-field"
          />
        </Label>
        <Label text="Factor L3">
          <input
            type="number"
            step={0.05}
            min={0.05}
            max={3}
            value={f3}
            onChange={(e) =>
              updateProp({
                threePhaseCurrentFactorL3: Math.min(
                  3,
                  Math.max(0.05, Number(e.target.value) || 1)
                ),
              })
            }
            className="input-field"
          />
        </Label>
        <p className={`text-[9px] font-medium ${tc.textMuted}`}>Power factor (per phase)</p>
        <Label text="PF L1 (blank = main PF)">
          <input
            type="number"
            step={0.01}
            min={0.05}
            max={1}
            value={
              selectedComp.properties.threePhasePowerFactorL1 === undefined
                ? ''
                : selectedComp.properties.threePhasePowerFactorL1
            }
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                updateProp({ threePhasePowerFactorL1: undefined });
                return;
              }
              updateProp({
                threePhasePowerFactorL1: Math.min(
                  1,
                  Math.max(0.05, Number(raw) || 0.85)
                ),
              });
            }}
            placeholder={`${selectedComp.properties.powerFactor ?? 0.85}`}
            className="input-field"
          />
        </Label>
        <Label text="PF L2">
          <input
            type="number"
            step={0.01}
            min={0.05}
            max={1}
            value={
              selectedComp.properties.threePhasePowerFactorL2 === undefined
                ? ''
                : selectedComp.properties.threePhasePowerFactorL2
            }
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                updateProp({ threePhasePowerFactorL2: undefined });
                return;
              }
              updateProp({
                threePhasePowerFactorL2: Math.min(
                  1,
                  Math.max(0.05, Number(raw) || 0.85)
                ),
              });
            }}
            placeholder={`${selectedComp.properties.powerFactor ?? 0.85}`}
            className="input-field"
          />
        </Label>
        <Label text="PF L3">
          <input
            type="number"
            step={0.01}
            min={0.05}
            max={1}
            value={
              selectedComp.properties.threePhasePowerFactorL3 === undefined
                ? ''
                : selectedComp.properties.threePhasePowerFactorL3
            }
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                updateProp({ threePhasePowerFactorL3: undefined });
                return;
              }
              updateProp({
                threePhasePowerFactorL3: Math.min(
                  1,
                  Math.max(0.05, Number(raw) || 0.85)
                ),
              });
            }}
            placeholder={`${selectedComp.properties.powerFactor ?? 0.85}`}
            className="input-field"
          />
        </Label>
        <p className={`text-[9px] font-medium ${tc.textMuted}`}>L–N voltage (× nominal U_L-N)</p>
        <Label text="U_L-N factor L1">
          <input
            type="number"
            step={0.02}
            min={0.65}
            max={1.35}
            value={selectedComp.properties.threePhaseVoltageFactorL1 ?? 1}
            onChange={(e) =>
              updateProp({
                threePhaseVoltageFactorL1: Math.min(
                  1.35,
                  Math.max(0.65, Number(e.target.value) || 1)
                ),
              })
            }
            className="input-field"
          />
        </Label>
        <Label text="U_L-N factor L2">
          <input
            type="number"
            step={0.02}
            min={0.65}
            max={1.35}
            value={selectedComp.properties.threePhaseVoltageFactorL2 ?? 1}
            onChange={(e) =>
              updateProp({
                threePhaseVoltageFactorL2: Math.min(
                  1.35,
                  Math.max(0.65, Number(e.target.value) || 1)
                ),
              })
            }
            className="input-field"
          />
        </Label>
        <Label text="U_L-N factor L3">
          <input
            type="number"
            step={0.02}
            min={0.65}
            max={1.35}
            value={selectedComp.properties.threePhaseVoltageFactorL3 ?? 1}
            onChange={(e) =>
              updateProp({
                threePhaseVoltageFactorL3: Math.min(
                  1.35,
                  Math.max(0.65, Number(e.target.value) || 1)
                ),
              })
            }
            className="input-field"
          />
        </Label>
        <button
          type="button"
          onClick={() =>
            updateProp({
              threePhaseCurrentFactorL1: undefined,
              threePhaseCurrentFactorL2: undefined,
              threePhaseCurrentFactorL3: undefined,
              threePhasePowerFactorL1: undefined,
              threePhasePowerFactorL2: undefined,
              threePhasePowerFactorL3: undefined,
              threePhaseVoltageFactorL1: undefined,
              threePhaseVoltageFactorL2: undefined,
              threePhaseVoltageFactorL3: undefined,
              powerWattsL1: undefined,
              powerWattsL2: undefined,
              powerWattsL3: undefined,
            })
          }
          className={`w-full rounded px-2 py-1.5 text-xs ${tc.btnBg} ${tc.btnText} ${tc.btnHover}`}
        >
          Reset phase options
        </button>
      </div>
    );
  };

export const renderThreePhaseMotorProps = () => {
// eslint-disable-next-line react-hooks/rules-of-hooks
    const { selectedComp, updateProp, resetTripped, tc } = usePPCtx();
    if (!selectedComp) return null;
    const ll = selectedComp.properties.lineVoltage ?? 400;
    return (
      <>
        <Label text="Load type">
          <select
            value={selectedComp.properties.loadType || 'inductive'}
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
            value={selectedComp.properties.powerWatts || 0}
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
            value={selectedComp.properties.powerFactor ?? 0.85}
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
        {renderPhaseCurrentUnbalanceFields()}
        <Label text="Nameplate line current (A)">
          <input
            type="number"
            value={
              selectedComp.properties.ratedLineAmps === undefined
                ? ''
                : selectedComp.properties.ratedLineAmps
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
        {selectedComp.state === 'fault' && (
          <button
            type="button"
            onClick={() => resetTripped(selectedComp.id)}
            className="w-full px-3 py-2 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-500"
          >
            Clear motor overload / fault
          </button>
        )}
        <Label text="State">
          <span
            className={`text-xs font-medium ${
              selectedComp.state === 'fault'
                ? 'text-red-400'
                : selectedComp.state === 'on'
                  ? 'text-green-400'
                  : tc.textMuted
            }`}
          >
            {selectedComp.state.toUpperCase()}
          </span>
        </Label>
      </>
    );
};

export const renderThreePhaseContactorProps = () => {
// eslint-disable-next-line react-hooks/rules-of-hooks
    const { selectedComp, updateProp, tc } = usePPCtx();
    if (!selectedComp) return null;
    const variant =
      selectedComp.type === 'four_phase_contactor' ? '4p' : '3p';
    return (
      <>
        <Label text="Poles">
          <span className={`text-xs ${tc.textMuted}`}>
            {variant === '4p' ? '4' : '3'} power + coil A1/A2
          </span>
        </Label>
        <Label text="Rating (A)">
          <select
            value={selectedComp.properties.ratingAmps || 25}
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
        <Label text="Power path (simulated)">
          <span
            className={`text-xs font-medium ${
              selectedComp.state === 'on'
                ? 'text-green-400'
                : tc.textMuted
            }`}
          >
            {selectedComp.state === 'on'
              ? 'Closed — coil has live + neutral'
              : 'Open — energize A1 and A2 (live ↔ neutral)'}
          </span>
        </Label>
        <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
          Main contacts close only when the coil terminals see line on one side
          and neutral on the other. Coil voltage is not modeled numerically.
        </p>
        <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
          Power path:{' '}
          {variant === '4p' ? (
            <>
              <strong>T1–T2</strong>, <strong>T3–T4</strong>,{' '}
              <strong>T5–T6</strong>, <strong>T7–T8</strong> (odd line in, even
              load out per pole), plus <strong>A1/A2</strong> and aux 13–14 /
              21–22.
            </>
          ) : (
            <>
              <strong>T1–T2</strong>, <strong>T3–T4</strong>,{' '}
              <strong>T5–T6</strong> (odd in, even out per line pole), plus{' '}
              <strong>A1/A2</strong> and aux 13–14 / 21–22.
            </>
          )}
        </p>
      </>
    );
  };

