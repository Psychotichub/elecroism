import React, { useMemo } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import {
  runCircuitDesignValidation,
  buildProtectionCoordinationReport,
  type CircuitValidationIssue,
  type ProtectionCoordinationRow,
} from '../../utils/circuitDesignValidation';
import { FiAlertCircle, FiAlertTriangle, FiInfo } from 'react-icons/fi';

function severityIcon(
  severity: CircuitValidationIssue['severity']
): React.ReactNode {
  if (severity === 'error')
    return <FiAlertCircle className="inline shrink-0 text-red-400" aria-hidden />;
  if (severity === 'warning')
    return (
      <FiAlertTriangle className="inline shrink-0 text-amber-400" aria-hidden />
    );
  return <FiInfo className="inline shrink-0 text-sky-400" aria-hidden />;
}

const CircuitValidationPanel: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const circuit = useCircuitStore((s) => s.circuit);
  const simulationResult = useCircuitStore((s) => s.simulationResult);
  const setSelected = useCircuitStore((s) => s.setSelected);
  const setPhaseImbalanceWarningPercent = useCircuitStore(
    (s) => s.setPhaseImbalanceWarningPercent
  );
  const setContinuityPowerThresholdW = useCircuitStore(
    (s) => s.setContinuityPowerThresholdW
  );

  const issues = useMemo(
    () => runCircuitDesignValidation(circuit, simulationResult),
    [circuit, simulationResult]
  );

  const coordination = useMemo(
    () => buildProtectionCoordinationReport(circuit),
    [circuit]
  );

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col overflow-hidden ${tc.panel} ${tc.text}`}
    >
      <div className={`shrink-0 border-b px-3 py-3 ${tc.border}`}>
        <h2 className={`text-sm font-bold ${tc.textBright}`}>
          Circuit validation
        </h2>
        <p className={`mt-1 text-[11px] leading-snug ${tc.textMuted}`}>
          Static checks before you rely on the last simulation: supply topology,
          motor phases, PE vs N, BMS control readiness, comms addressing,
          protection coordination (feeder order and grading hints), and cable vs
          breaker / current hints. Time–current curves are not drawn yet.
        </p>
        <div
          className={`mt-2 flex flex-wrap items-center gap-2 border-t pt-2 ${tc.border}`}
        >
          <label
            htmlFor="imbalance-warn-pct"
            className={`text-[10px] ${tc.textMuted}`}
          >
            3φ motor imbalance warning over mean (%)
          </label>
          <input
            id="imbalance-warn-pct"
            type="number"
            min={0}
            max={100}
            step={1}
            value={circuit.phaseImbalanceWarningPercent ?? 15}
            onChange={(e) =>
              setPhaseImbalanceWarningPercent(Number(e.target.value) || 0)
            }
            className="input-field w-16 py-1 text-xs"
          />
          <label
            htmlFor="continuity-thresh-w"
            className={`ml-3 text-[10px] ${tc.textMuted}`}
          >
            Continuity “closed” min. (W)
          </label>
          <input
            id="continuity-thresh-w"
            type="number"
            min={0.01}
            max={500}
            step={0.05}
            value={circuit.continuityPowerThresholdW ?? 0.5}
            onChange={(e) =>
              setContinuityPowerThresholdW(Number(e.target.value) || 0.5)
            }
            className="input-field w-20 py-1 text-xs"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-4">
        {coordination.rows.length > 0 && (
          <div>
            <h3
              className={`mb-1.5 text-[11px] font-bold uppercase tracking-wide ${tc.textMuted}`}
            >
              Protection coordination
            </h3>
            <p className={`mb-2 text-[10px] leading-snug ${tc.textMuted}`}>
              Order is by shortest path (hops) from a supply live terminal to
              each device&apos;s line-side IN — parallel feeders may look odd.
              Trip labels are indicative (full I²t curves are not plotted).
            </p>
            <div className={`overflow-x-auto rounded-md border ${tc.border}`}>
              <table className="w-full min-w-[280px] border-collapse text-left text-[10px]">
                <thead>
                  <tr className={theme === 'dark' ? 'bg-white/5' : 'bg-black/[0.03]'}>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      Device
                    </th>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      Iₙ (A)
                    </th>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      Trip / type
                    </th>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      Hops
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {coordination.rows.map((r: ProtectionCoordinationRow) => (
                    <tr key={r.componentId}>
                      <td className={`border-b px-2 py-1.5 ${tc.border}`}>
                        <button
                          type="button"
                          className={`text-left font-medium underline-offset-2 hover:underline ${tc.textBright}`}
                          onClick={() => setSelected(r.componentId)}
                        >
                          {r.label}
                        </button>
                        <span className={`block font-normal ${tc.textMuted}`}>
                          {r.deviceType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className={`border-b px-2 py-1.5 tabular-nums ${tc.border}`}>
                        {r.ratedAmps != null ? r.ratedAmps : '—'}
                      </td>
                      <td className={`border-b px-2 py-1.5 ${tc.border}`}>
                        {r.tripOrFamily ?? '—'}
                      </td>
                      <td className={`border-b px-2 py-1.5 tabular-nums ${tc.border}`}>
                        {r.minHopsFromLive != null ? r.minHopsFromLive : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {issues.length === 0 ? (
          <p
            className={`rounded-md border px-3 py-4 text-center text-xs ${tc.border} ${theme === 'dark' ? 'border-emerald-900/50 bg-emerald-950/30 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}
          >
            No issues detected for the current checks. Run simulation after
            edits to refresh current-based wire warnings.
          </p>
        ) : (
          <ul className="space-y-2">
            {issues.map((issue) => (
              <li key={issue.id}>
                <button
                  type="button"
                  disabled={issue.componentIds.length === 0}
                  onClick={() => {
                    const id = issue.componentIds[0];
                    if (id) setSelected(id);
                  }}
                  className={`w-full rounded-md border px-2.5 py-2 text-left text-[11px] leading-snug transition-colors disabled:cursor-default ${tc.border} ${
                    issue.componentIds.length > 0
                      ? theme === 'dark'
                        ? 'hover:bg-white/5'
                        : 'hover:bg-black/[0.04]'
                      : 'opacity-95'
                  } ${theme === 'dark' ? 'bg-black/20' : 'bg-white/80'}`}
                >
                  <span className="mr-1.5 align-middle">
                    {severityIcon(issue.severity)}
                  </span>
                  <span className={`align-middle ${tc.text}`}>{issue.message}</span>
                  {issue.componentIds.length > 0 && (
                    <span
                      className={`mt-1 block text-[10px] ${tc.textMuted}`}
                    >
                      Click to select:{' '}
                      {issue.componentIds
                        .map((cid) => circuit.components.find((c) => c.id === cid)?.label)
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CircuitValidationPanel;
