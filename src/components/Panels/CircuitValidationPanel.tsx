import React, { useMemo } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import {
  runCircuitDesignValidation,
  type CircuitValidationIssue,
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

  const issues = useMemo(
    () => runCircuitDesignValidation(circuit, simulationResult),
    [circuit, simulationResult]
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
          motor phases, PE vs N, BMS control readiness, comms addressing, and
          cable vs breaker / current hints.
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
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
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
