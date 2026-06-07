import React from 'react';
import { usePPCtx } from '../PropertyPanelContext';
import { Label } from '../PropertyPanelLabel';
import type { ComponentProperties } from '../../../../types';

type ThdHarmonicFieldsProps = {
  showMotorDrive?: boolean;
  showSmpsHint?: boolean;
};

/** THD % and VFD drive fields for nonlinear load modeling. */
const ThdHarmonicFields: React.FC<ThdHarmonicFieldsProps> = ({
  showMotorDrive,
  showSmpsHint,
}) => {
  const { selectedComp, tc, updateProp } = usePPCtx();
  if (!selectedComp) return null;

  const thd = selectedComp.properties.thdPercent ?? 0;
  const drive = selectedComp.properties.motorDrive ?? 'dol';

  return (
    <div className={`rounded-md border p-2.5 space-y-2 ${tc.border}`}>
      <p className={`text-[10px] font-semibold ${tc.textBright}`}>
        Harmonics / power quality
      </p>
      {showMotorDrive ? (
        <Label text="Motor drive">
          <select
            value={drive}
            onChange={(e) => {
              const motorDrive = e.target.value as ComponentProperties['motorDrive'];
              updateProp({
                motorDrive,
                thdPercent:
                  motorDrive === 'vfd'
                    ? (selectedComp.properties.thdPercent ?? 35)
                    : (selectedComp.properties.thdPercent ?? 0),
              });
            }}
            className="input-field"
          >
            <option value="dol">DOL / soft starter (linear)</option>
            <option value="vfd">VFD (nonlinear)</option>
          </select>
        </Label>
      ) : null}
      <Label text="Input current THD (%)">
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={thd}
          onChange={(e) =>
            updateProp({
              thdPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
            })
          }
          className="input-field"
        />
      </Label>
      <div className="flex flex-wrap gap-1">
        {[0, 15, 35, 80].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => updateProp({ thdPercent: p })}
            className={`rounded px-2 py-0.5 text-[10px] ${
              thd === p ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            {p === 0 ? 'Linear' : `${p}%`}
          </button>
        ))}
      </div>
      <p className={`text-[10px] leading-snug ${tc.textMuted}`}>
        {showSmpsHint
          ? 'SMPS draws pulsed input current — typical THD 60–100%. RMS current is higher than fundamental for the same real power.'
          : 'Nonlinear loads increase RMS current and inject triplen (3rd-order) harmonics that add in the neutral on 3φ + N systems.'}
      </p>
    </div>
  );
};

export default ThdHarmonicFields;
