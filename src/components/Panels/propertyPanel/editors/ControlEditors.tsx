import { usePPCtx } from '../PropertyPanelContext';
import { Label } from '../PropertyPanelLabel';
import type { ComponentProperties } from '../../../../types';

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderTimerProps = () => { const { selectedComp, tc, updateProp } = usePPCtx(); return (
    <>
      <Label text="Timer mode">
        <span className={`es-typo-body ${tc.textMuted}`}>
          ON-delay (coil energizes first, contact closes after delay)
        </span>
      </Label>
      <Label text="Delay (ms)">
        <input
          type="number"
          value={selectedComp!.properties.timerDelayMs ?? 1000}
          onChange={(e) =>
            updateProp({ timerDelayMs: Math.max(0, Number(e.target.value) || 0) })
          }
          className="input-field"
          min={0}
          step={100}
        />
      </Label>
      <Label text="Quick presets">
        <div className="flex gap-1 flex-wrap">
          {[200, 500, 1000, 3000, 5000, 10000].map((ms) => (
            <button
              key={ms}
              type="button"
              onClick={() => updateProp({ timerDelayMs: ms })}
              className={`px-2 py-1 rounded es-typo-body ${
                (selectedComp!.properties.timerDelayMs ?? 1000) === ms
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(ms % 1000 ? 1 : 0)}s`}
            </button>
          ))}
        </div>
      </Label>
      <Label text="Contact state">
        <span
          className={`es-typo-body font-medium ${
            selectedComp!.state === 'on' ? 'text-green-400' : tc.textMuted
          }`}
        >
          {selectedComp!.state === 'on'
            ? 'NO closed, NC open — delay elapsed'
            : 'NC closed, NO open — waiting for coil + delay'}
        </span>
      </Label>
      <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
        Wire <strong>A1/A2</strong> as timer coil supply. Use{' '}
        <strong>COM↔NO</strong> for delayed make and <strong>COM↔NC</strong> for
        delayed break behavior. The timer resets instantly when coil drops.
      </p>
    </>
  );};

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderInterposingRelayProps = () => { const { selectedComp, tc, updateProp } = usePPCtx(); return (
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
              className={`px-2 py-1 rounded es-typo-body ${
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
      <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
        Coil A1/A2 picked up → IN/OUT NO contact closes. Use one between any
        BMS digital output and a contactor coil so the BMS never lands
        directly on a heavy AC coil.
      </p>
    </>
  );};

export const renderAuxContactBlockProps = () => {
// eslint-disable-next-line react-hooks/rules-of-hooks
    const { circuit, selectedComp, updateProp, tc } = usePPCtx();
    if (!selectedComp) return null;
    const followCoilTypes: ReadonlyArray<(typeof circuit.components)[0]['type']> = [
      'contactor',
      'relay',
      'smart_relay',
      'timer',
      'three_phase_contactor',
      'four_phase_contactor',
      'interposing_relay',
    ];
    const coilTargets = circuit.components.filter((c) =>
      followCoilTypes.includes(c.type)
    );
    const followId = selectedComp.properties.auxContactFollowContactorId ?? '';
    return (
      <>
        <Label text="Contact rating (A)">
          <input
            type="number"
            value={selectedComp.properties.ratingAmps ?? 10}
            onChange={(e) =>
              updateProp({
                ratingAmps: Math.max(0, Number(e.target.value) || 0),
              })
            }
            className="input-field"
            min={0}
          />
        </Label>
        <Label text="Mirror coil (seal-in / interlock)">
          <select
            className="input-field"
            value={followId}
            onChange={(e) => {
              const v = e.target.value.trim();
              updateProp({
                auxContactFollowContactorId: v ? v : undefined,
              });
            }}
          >
            <option value="">Manual — On/Off toggles 13–14 vs 21–22</option>
            {coilTargets.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Label>
        <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
          For a <strong>seal-in</strong> path wired to this block’s{' '}
          <strong>13–14</strong>, choose the same contactor/relay whose coil is{' '}
          <strong>A1/A2</strong>. Otherwise 13–14 stays open unless you set the
          block to <strong>On</strong> manually. Built-in <strong>13/14/21/22</strong>{' '}
          on the contactor symbol already follow the coil automatically.
        </p>
      </>
    );
  };

