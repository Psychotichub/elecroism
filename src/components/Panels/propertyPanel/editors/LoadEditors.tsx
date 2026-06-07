import { usePPCtx } from '../PropertyPanelContext';
import { Label } from '../PropertyPanelLabel';
import type { ComponentProperties } from '../../../../types';
import { renderPhaseCurrentUnbalanceFields } from './ThreePhaseEditors';
import ThdHarmonicFields from './ThdHarmonicFields';
import { MotorThermalReadout } from './MotorThermalReadout';

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderLoadProps = () => { const { selectedComp, updateProp } = usePPCtx();
  const isMotor = selectedComp?.type === 'motor';
  return (
    <>
      {isMotor ? <MotorThermalReadout /> : null}
      {isMotor && selectedComp ? (
        <Label text="Nameplate current (A)">
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
      ) : null}
      <Label text="Load Type">
        <select
          value={selectedComp?.properties.loadType || 'resistive'}
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
      {renderPhaseCurrentUnbalanceFields()}
      <ThdHarmonicFields />
    </>
  );};

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderSocketProps = () => { const { selectedComp, updateProp } = usePPCtx(); return (
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
  );};

export const renderIndicatorLampProps = () => {
// eslint-disable-next-line react-hooks/rules-of-hooks
    const { selectedComp, updateProp, tc } = usePPCtx();
    if (!selectedComp) return null;
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
                  selectedComp.properties.indicatorColor === c.v
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
                  (selectedComp.properties.indicatorPhaseTag ?? 'L') === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Label>
        <Label text="Supply type">
          <div className="flex gap-1">
            {([
              { v: 'ac', l: 'AC' },
              { v: 'dc', l: 'DC' },
            ] as const).map((s) => (
              <button
                key={s.v}
                type="button"
                onClick={() => updateProp({ indicatorSupplyType: s.v })}
                className={`flex-1 px-2 py-1 rounded text-xs ${
                  (selectedComp.properties.indicatorSupplyType ?? 'ac') === s.v
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {s.l}
              </button>
            ))}
          </div>
        </Label>
        <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
          Wire <strong>L</strong> to the phase you want indicated and{' '}
          <strong>N</strong> to neutral / return. The lamp lights only when the
          selected supply type matches the connected network.
        </p>
      </>
    );
  };

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderPhaseIndicatorBankProps = () => { const { selectedComp, tc, updateProp } = usePPCtx(); return (
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
  );};

