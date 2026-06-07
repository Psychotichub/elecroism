import { usePPCtx } from '../PropertyPanelContext';
import { Label } from '../PropertyPanelLabel';
import ThdHarmonicFields from './ThdHarmonicFields';

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderPowerSourceProps = () => { const { selectedComp, updateProp } = usePPCtx(); return (
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
  );};

 
export const renderAcDcConverterProps = () => {
// eslint-disable-next-line react-hooks/rules-of-hooks
    const { selectedComp, updateProp, tc, theme } = usePPCtx();
    if (!selectedComp) return null;
    const p = selectedComp.properties;
    return (
      <>
        <Label text="DC output voltage (V)">
          <input
            type="number"
            value={p.voltage ?? 24}
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
        <Label text="Rated DC output power (W)">
          <input
            type="number"
            value={p.powerWatts ?? 60}
            onChange={(e) =>
              updateProp({ powerWatts: Math.max(1, Number(e.target.value) || 1) })
            }
            className="input-field"
            min={1}
          />
        </Label>
        <Label text="Efficiency (%)">
          <input
            type="number"
            value={p.supplyEfficiencyPercent ?? 60}
            onChange={(e) =>
              updateProp({
                supplyEfficiencyPercent: Math.min(
                  99,
                  Math.max(1, Number(e.target.value) || 60)
                ),
              })
            }
            className="input-field"
            min={1}
            max={99}
          />
        </Label>
        <Label text="AC input power factor">
          <input
            type="number"
            value={p.inputPowerFactor ?? 0.7}
            onChange={(e) =>
              updateProp({
                inputPowerFactor: Math.min(
                  1,
                  Math.max(0.05, Number(e.target.value) || 0.7)
                ),
              })
            }
            className="input-field"
            min={0.05}
            max={1}
            step={0.05}
          />
        </Label>
        <Label text="Presets (DC out)">
          <div className="flex gap-1 flex-wrap">
            {[5, 12, 24, 48, 110].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => updateProp({ voltage: preset })}
                className={`px-2 py-1 rounded es-typo-body ${
                  (p.voltage ?? 24) === preset
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {preset} V
              </button>
            ))}
          </div>
        </Label>
        <Label text="Nominal AC input (Vrms)">
          <input
            type="number"
            value={p.acDcInputVoltageV ?? 230}
            onChange={(e) =>
              updateProp({
                acDcInputVoltageV: Math.max(1, Number(e.target.value) || 230),
              })
            }
            className="input-field"
            min={1}
            step={1}
          />
        </Label>
        <Label text="Mains frequency">
          <select
            value={String(p.acDcMainsFrequencyHz ?? 50)}
            onChange={(e) =>
              updateProp({
                acDcMainsFrequencyHz: Number(e.target.value) as 50 | 60,
              })
            }
            className="input-field"
          >
            <option value="50">50 Hz</option>
            <option value="60">60 Hz</option>
          </select>
        </Label>
        <Label text="Stage 1: mains transformer">
          <select
            value={(p.acDcHasTransformer ?? true) ? 'yes' : 'no'}
            onChange={(e) =>
              updateProp({ acDcHasTransformer: e.target.value === 'yes' })
            }
            className="input-field"
          >
            <option value="yes">Yes (isolation / step-down)</option>
            <option value="no">No (direct-off-line after fuse — faceplate only)</option>
          </select>
        </Label>
        <Label text="Stage 2: rectifier type">
          <select
            value={p.acDcRectifierType ?? 'bridge'}
            onChange={(e) =>
              updateProp({
                acDcRectifierType: e.target.value as
                  | 'half_wave'
                  | 'full_wave'
                  | 'bridge',
              })
            }
            className="input-field"
          >
            <option value="half_wave">Half-wave (1 diode)</option>
            <option value="full_wave">Full-wave (2 diodes + CT)</option>
            <option value="bridge">Bridge (4 diodes)</option>
          </select>
        </Label>
        <Label text="Stage 4: voltage regulator">
          <select
            value={(p.acDcHasRegulator ?? true) ? 'yes' : 'no'}
            onChange={(e) =>
              updateProp({ acDcHasRegulator: e.target.value === 'yes' })
            }
            className="input-field"
          >
            <option value="yes">Yes (smooth DC at setpoint)</option>
            <option value="no">No (raw filtered bus — faceplate only)</option>
          </select>
        </Label>
        <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
          Wire <strong>AC_L</strong> and <strong>AC_N</strong> to mains. The
          simulator energizes <strong>DC_PLUS</strong> / <strong>DC_MINUS</strong>{' '}
          when AC is present. Primary AC current follows DC bus load:
          I<sub>AC</sub> ≈ (V<sub>DC</sub>×I<sub>DC</sub>)/(V<sub>AC</sub>×η×PF).
          Exceeding rated output power trips the supply. Rectifier stages above
          are educational faceplate options — use <strong>SMPS</strong> for
          switch-mode bricks.
        </p>
        <details
          className={`rounded border ${tc.border} ${theme === 'dark' ? 'bg-black/20' : 'bg-gray-50'} px-2 py-1.5`}
        >
          <summary
            className={`es-typo-body-sm cursor-pointer select-none ${tc.textBright}`}
          >
            Theory: rectification and linear AC→DC
          </summary>
          <div
            className={`mt-2 space-y-2 es-typo-caption leading-snug ${tc.textMuted}`}
          >
            <p>
              An AC→DC converter changes grid AC (which reverses direction) into DC
              (one direction). That process is called <strong>rectification</strong>.
              Most loads still need a <strong>filter</strong> (capacitor) to smooth
              ripple and often a <strong>regulator</strong> for a stable output
              voltage.
            </p>
            <p>
              <strong>Why it is needed:</strong> grids supply AC (e.g. 230 V / 50 Hz),
              while electronics and batteries use DC — so wall-powered devices include
              rectification and regulation.
            </p>
            <p>
              <strong>Stages (typical linear path):</strong> (1) optional transformer
              for isolation or voltage step-down; (2) rectifier — diodes conduct only
              one way (half-wave uses one diode, full-wave two, bridge four); (3)
              filter capacitor smooths pulsating DC; (4) linear regulator holds V
              against load and ripple.
            </p>
            <p>
              A full-wave rectified waveform follows an idealised{' '}
              <strong>|sin(θ)|</strong> envelope (shown on the symbol). Real ripple
              and losses are not modeled numerically here.
            </p>
            <p>
              <strong>vs SMPS:</strong> a linear supply is simpler and can be very
              clean electrically but is bulky and inefficient. Switch-mode supplies
              (phone chargers, PC bricks) use high-frequency conversion for efficiency;
              use the <strong>SMPS</strong> symbol for that topology.
            </p>
          </div>
        </details>
      </>
    );
  };

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderDcPowerSourceProps = () => { const { selectedComp, tc, updateProp } = usePPCtx(); return (
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
              className={`px-2 py-1 rounded es-typo-body ${
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
      <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
        Positive (DC_PLUS) and return (DC_MINUS) behave like L and N in the
        simulator for reachability and load current.
      </p>
    </>
  );};

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderThreePhaseSourceProps = () => { const { selectedComp, tc, updateProp } = usePPCtx();
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
          <span className={`es-typo-body ${tc.text}`}>
            {(ll / Math.sqrt(3)).toFixed(1)} (balanced wye)
          </span>
        </Label>
      </>
    );
  };

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderSmpsProps = () => { const { selectedComp, tc, updateProp } = usePPCtx(); return (
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
      <Label text="Rated DC output power (W)">
        <input
          type="number"
          value={selectedComp!.properties.powerWatts ?? 120}
          onChange={(e) =>
            updateProp({ powerWatts: Math.max(1, Number(e.target.value) || 1) })
          }
          className="input-field"
          min={1}
        />
      </Label>
      <Label text="Efficiency (%)">
        <input
          type="number"
          value={selectedComp!.properties.supplyEfficiencyPercent ?? 88}
          onChange={(e) =>
            updateProp({
              supplyEfficiencyPercent: Math.min(
                99,
                Math.max(1, Number(e.target.value) || 88)
              ),
            })
          }
          className="input-field"
          min={1}
          max={99}
        />
      </Label>
      <Label text="AC input power factor">
        <input
          type="number"
          value={selectedComp!.properties.inputPowerFactor ?? 0.65}
          onChange={(e) =>
            updateProp({
              inputPowerFactor: Math.min(
                1,
                Math.max(0.05, Number(e.target.value) || 0.65)
              ),
            })
          }
          className="input-field"
          min={0.05}
          max={1}
          step={0.05}
        />
      </Label>
      <ThdHarmonicFields showSmpsHint />
      <Label text="Presets">
        <div className="flex gap-1 flex-wrap">
          {[5, 12, 24, 48, 110].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => updateProp({ voltage: p })}
              className={`px-2 py-1 rounded es-typo-body ${
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
      <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
        Wire <strong>AC_L</strong> + <strong>AC_N</strong> to mains; the DC
        bus (<strong>V+ / V−</strong>) energizes when AC is present. Primary
        current scales with downstream DC load; exceeding rated output power
        shuts the supply down. Choose this symbol for switch-mode PSUs on the
        diagram.
      </p>
    </>
  );};

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderControlTransformerProps = () => { const { selectedComp, tc, updateProp } = usePPCtx(); return (
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
              className={`px-2 py-1 rounded es-typo-body ${
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
      <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
        Primary is <strong>PRI_L / PRI_N</strong>; secondary is{' '}
        <strong>SEC_L / SEC_N</strong>. Use this when the control circuit needs
        isolation and a stepped-down AC control voltage.
      </p>
    </>
  );};

