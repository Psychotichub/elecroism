import React from 'react';
import { usePPCtx } from '../PropertyPanelContext';
import { useUiStore } from '../../../../store/uiStore';
import { findMotorThermalProtector } from '../../../../simulation/motorThermal';
import { useCircuitStore } from '../../../../store/circuitStore';

export const MotorThermalReadout: React.FC = () => {
  const { selectedComp, tc } = usePPCtx();
  const circuit = useCircuitStore((s) => s.circuit);
  const thermal = useUiStore((s) => s.motorThermalById[selectedComp?.id ?? '']);

  if (!selectedComp) return null;
  if (selectedComp.type !== 'motor' && selectedComp.type !== 'three_phase_motor') {
    return null;
  }

  const protector = findMotorThermalProtector(circuit, selectedComp.id);
  const pct = thermal?.thermalPct;
  const tripped = thermal?.tripped ?? false;

  return (
    <div className={`rounded-md border p-2.5 space-y-1.5 ${tc.border}`}>
      <p className={`es-typo-caption font-semibold ${tc.textBright}`}>
        Motor thermal model
      </p>
      <p className={`es-typo-caption leading-snug ${tc.textMuted}`}>
        I²t integrator from scope timeline — class {thermal?.tripClassS ?? 10}s
        {protector ? ` via ${protector.label}` : ''}. Record the oscilloscope to
        update.
      </p>
      {pct != null ? (
        <>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 flex-1 overflow-hidden rounded-full ${
                tripped ? 'bg-red-900/40' : 'bg-gray-700/50'
              }`}
            >
              <div
                className={`h-full transition-all ${
                  tripped
                    ? 'bg-red-500'
                    : pct > 75
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <span
              className={`es-typo-body font-semibold es-tabular-nums ${
                tripped ? 'text-red-400' : tc.textBright
              }`}
            >
              {pct.toFixed(1)}%
            </span>
          </div>
          {thermal?.currentRatio != null ? (
            <p className={`es-typo-caption ${tc.textMuted}`}>
              I / I<sub>pickup</sub> = {thermal.currentRatio.toFixed(2)} at cursor
            </p>
          ) : null}
          {tripped ? (
            <p className="es-typo-caption font-medium text-red-400">
              Thermal trip — overload curve exceeded
            </p>
          ) : null}
        </>
      ) : (
        <p className={`es-typo-caption italic ${tc.textMuted}`}>
          No thermal data — open Scope, select this motor, and Record.
        </p>
      )}
    </div>
  );
};
