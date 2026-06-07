import React, { useMemo } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import {
  runCircuitDesignValidation,
  buildProtectionCoordinationReport,
  buildEarthFaultLoopReport,
  buildArcFlashReport,
  buildFaultLevelReport,
  buildPowerQualityReport,
  downloadArcFlashLabel,
  type CircuitValidationIssue,
  type ProtectionCoordinationRow,
  type EarthFaultLoopRow,
  type ArcFlashRow,
  type FaultLevelRow,
  type PowerQualityRow,
} from '../../utils/circuitDesignValidation';
import { learningHintForIssue } from '../../utils/learningHints';
import DesignatorToolsSection from './DesignatorToolsSection';
import DrawingExportSection from './DrawingExportSection';
import ProjectSnapshotsSection from './ProjectSnapshotsSection';
import ComponentLibrarySection from './ComponentLibrarySection';
import { useUiStore } from '../../store/uiStore';
import { FiAlertCircle, FiAlertTriangle, FiInfo, FiDownload } from 'react-icons/fi';

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
  const learningMode = useUiStore((s) => s.learningMode);
  const toggleLearningMode = useUiStore((s) => s.toggleLearningMode);

  const issues = useMemo(
    () => runCircuitDesignValidation(circuit, simulationResult),
    [circuit, simulationResult]
  );

  const coordination = useMemo(
    () => buildProtectionCoordinationReport(circuit),
    [circuit]
  );

  const earthFaultLoops = useMemo(
    () => buildEarthFaultLoopReport(circuit, simulationResult),
    [circuit, simulationResult]
  );

  const arcFlashRows = useMemo(
    () => buildArcFlashReport(circuit, simulationResult),
    [circuit, simulationResult]
  );

  const faultLevels = useMemo(
    () => buildFaultLevelReport(circuit, simulationResult),
    [circuit, simulationResult]
  );

  const powerQuality = useMemo(
    () => buildPowerQualityReport(circuit, simulationResult),
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
          motor phases, PE vs N, BMS control readiness, comms addressing,
          protection coordination, cable vs breaker hints, and short-circuit
          breaking capacity, earth-fault loop impedance (Zs), and arc-flash
          incident energy estimates.
        </p>
        <label
          className={`mt-2 flex cursor-pointer items-center gap-2 text-[11px] ${tc.text}`}
        >
          <input
            type="checkbox"
            checked={learningMode}
            onChange={() => toggleLearningMode()}
            className="rounded border-gray-500"
          />
          Learning mode — plain-language hints under each issue
        </label>
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
        <ComponentLibrarySection />
        <ProjectSnapshotsSection />
        <DrawingExportSection />
        <DesignatorToolsSection />
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

        {powerQuality.length > 0 && (
          <div>
            <h3
              className={`mb-1.5 text-[11px] font-bold uppercase tracking-wide ${tc.textMuted}`}
            >
              Power quality / harmonics
            </h3>
            <p className={`mb-2 text-[10px] leading-snug ${tc.textMuted}`}>
              Nonlinear loads (SMPS, VFD) with configurable THD. Triplen (3rd-order)
              harmonics add in the neutral on 3φ + N — Σ I_N shown per load.
            </p>
            {simulationResult?.powerQualityNeutralHarmonicA != null &&
            simulationResult.powerQualityNeutralHarmonicA > 0 ? (
              <p className={`mb-2 text-[10px] font-medium text-amber-400`}>
                Board Σ neutral harmonic ≈{' '}
                {simulationResult.powerQualityNeutralHarmonicA.toFixed(1)} A
              </p>
            ) : null}
            <div className={`overflow-x-auto rounded-md border ${tc.border}`}>
              <table className="w-full min-w-[300px] border-collapse text-left text-[10px]">
                <thead>
                  <tr className={theme === 'dark' ? 'bg-white/5' : 'bg-black/[0.03]'}>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      Load
                    </th>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      THD %
                    </th>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      I₁ (A)
                    </th>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      I_rms (A)
                    </th>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      I_N h3 (A)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {powerQuality.map((r: PowerQualityRow) => (
                    <tr key={r.componentId}>
                      <td className={`border-b px-2 py-1.5 ${tc.border}`}>
                        <button
                          type="button"
                          className={`text-left font-medium underline-offset-2 hover:underline ${tc.textBright}`}
                          onClick={() => setSelected(r.componentId)}
                        >
                          {r.label}
                        </button>
                        <span className={`block ${tc.textMuted}`}>
                          {r.deviceType}
                        </span>
                      </td>
                      <td className={`border-b px-2 py-1.5 tabular-nums ${tc.border}`}>
                        {r.thdPercent.toFixed(0)}
                      </td>
                      <td className={`border-b px-2 py-1.5 tabular-nums ${tc.border}`}>
                        {r.fundamentalCurrentA.toFixed(2)}
                      </td>
                      <td className={`border-b px-2 py-1.5 tabular-nums ${tc.border}`}>
                        {r.rmsCurrentA.toFixed(2)}
                      </td>
                      <td className={`border-b px-2 py-1.5 tabular-nums ${tc.border}`}>
                        {r.triplenNeutralA.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {faultLevels.length > 0 && (
          <div>
            <h3
              className={`mb-1.5 text-[11px] font-bold uppercase tracking-wide ${tc.textMuted}`}
            >
              Prospective fault levels
            </h3>
            <p className={`mb-2 text-[10px] leading-snug ${tc.textMuted}`}>
              Bolted short-circuit current from source impedance (Ze + feeder R)
              at each protection device. Used for breaking-capacity checks and
              arc-flash estimates.
            </p>
            <div className={`overflow-x-auto rounded-md border ${tc.border}`}>
              <table className="w-full min-w-[280px] border-collapse text-left text-[10px]">
                <thead>
                  <tr className={theme === 'dark' ? 'bg-white/5' : 'bg-black/[0.03]'}>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      Device
                    </th>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      Zs (Ω)
                    </th>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      Isc (kA)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {faultLevels.map((r: FaultLevelRow) => (
                    <tr key={r.deviceId}>
                      <td className={`border-b px-2 py-1.5 ${tc.border}`}>
                        <button
                          type="button"
                          className={`text-left font-medium underline-offset-2 hover:underline ${tc.textBright}`}
                          onClick={() => setSelected(r.deviceId)}
                        >
                          {r.label}
                        </button>
                        <span className={`block ${tc.textMuted}`}>
                          {r.deviceType}
                        </span>
                      </td>
                      <td className={`border-b px-2 py-1.5 tabular-nums ${tc.border}`}>
                        {r.sourceImpedanceOhms.toFixed(3)}
                      </td>
                      <td className={`border-b px-2 py-1.5 tabular-nums font-semibold ${tc.border}`}>
                        {(r.faultCurrentA / 1000).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {earthFaultLoops.length > 0 && (
          <div>
            <h3
              className={`mb-1.5 text-[11px] font-bold uppercase tracking-wide ${tc.textMuted}`}
            >
              Earth-fault loop (Zs)
            </h3>
            <p className={`mb-2 text-[10px] leading-snug ${tc.textMuted}`}>
              Zs = Ze + R₁ + R₂ from wire length and cross-section. Compared to
              max Zs for the upstream MCB/fuse (0.4 s / 5 s rules, simplified).
            </p>
            <div className={`overflow-x-auto rounded-md border ${tc.border}`}>
              <table className="w-full min-w-[320px] border-collapse text-left text-[10px]">
                <thead>
                  <tr className={theme === 'dark' ? 'bg-white/5' : 'bg-black/[0.03]'}>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      Load
                    </th>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      Protector
                    </th>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      Zs (Ω)
                    </th>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      Max
                    </th>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      Iₐ (A)
                    </th>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      Rule
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {earthFaultLoops.map((r: EarthFaultLoopRow) => (
                    <tr key={r.loadId}>
                      <td className={`border-b px-2 py-1.5 ${tc.border}`}>
                        <button
                          type="button"
                          className={`text-left font-medium underline-offset-2 hover:underline ${tc.textBright}`}
                          onClick={() => setSelected(r.loadId)}
                        >
                          {r.loadLabel}
                        </button>
                      </td>
                      <td className={`border-b px-2 py-1.5 ${tc.border}`}>
                        {r.protectorLabel ? (
                          <button
                            type="button"
                            className="underline-offset-2 hover:underline"
                            onClick={() =>
                              r.protectorId && setSelected(r.protectorId)
                            }
                          >
                            {r.protectorLabel}
                          </button>
                        ) : (
                          '—'
                        )}
                        {r.ratedAmps != null ? (
                          <span className={`block ${tc.textMuted}`}>
                            {r.ratedAmps} A {r.tripCurve ?? ''}
                          </span>
                        ) : null}
                      </td>
                      <td
                        className={`border-b px-2 py-1.5 tabular-nums ${tc.border} ${
                          r.ok ? tc.text : 'text-red-400 font-semibold'
                        }`}
                      >
                        {r.zsOhms.toFixed(2)}
                      </td>
                      <td className={`border-b px-2 py-1.5 tabular-nums ${tc.border}`}>
                        {r.maxZsOhms != null ? r.maxZsOhms.toFixed(2) : '—'}
                      </td>
                      <td className={`border-b px-2 py-1.5 tabular-nums ${tc.border}`}>
                        {r.faultCurrentA.toFixed(0)}
                      </td>
                      <td className={`border-b px-2 py-1.5 ${tc.border}`}>
                        {r.disconnectionRule}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {arcFlashRows.length > 0 && (
          <div>
            <h3
              className={`mb-1.5 text-[11px] font-bold uppercase tracking-wide ${tc.textMuted}`}
            >
              Arc-flash (simplified)
            </h3>
            <p className={`mb-2 text-[10px] leading-snug ${tc.textMuted}`}>
              Lee-equation estimate from bolted fault current, arc factor 50%,
              device clearing time, and 18 in working distance. Download a
              printable label per device.
            </p>
            <div className={`overflow-x-auto rounded-md border ${tc.border}`}>
              <table className="w-full min-w-[340px] border-collapse text-left text-[10px]">
                <thead>
                  <tr className={theme === 'dark' ? 'bg-white/5' : 'bg-black/[0.03]'}>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      Device
                    </th>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      Ibf (kA)
                    </th>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      t (ms)
                    </th>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      E (cal/cm²)
                    </th>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      AFB (m)
                    </th>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      PPE
                    </th>
                    <th className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}>
                      Label
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {arcFlashRows.map((r: ArcFlashRow) => (
                    <tr key={r.deviceId}>
                      <td className={`border-b px-2 py-1.5 ${tc.border}`}>
                        <button
                          type="button"
                          className={`text-left font-medium underline-offset-2 hover:underline ${tc.textBright}`}
                          onClick={() => setSelected(r.deviceId)}
                        >
                          {r.label}
                        </button>
                        <span className={`block ${tc.textMuted}`}>
                          {r.deviceType}
                        </span>
                      </td>
                      <td className={`border-b px-2 py-1.5 tabular-nums ${tc.border}`}>
                        {(r.boltedFaultCurrentA / 1000).toFixed(2)}
                      </td>
                      <td className={`border-b px-2 py-1.5 tabular-nums ${tc.border}`}>
                        {(r.clearingTimeS * 1000).toFixed(0)}
                      </td>
                      <td
                        className={`border-b px-2 py-1.5 tabular-nums font-semibold ${tc.border} ${
                          r.ppeCategory >= '3'
                            ? 'text-red-400'
                            : r.ppeCategory === '2'
                              ? 'text-amber-400'
                              : tc.text
                        }`}
                      >
                        {r.incidentEnergyCalCm2.toFixed(1)}
                      </td>
                      <td className={`border-b px-2 py-1.5 tabular-nums ${tc.border}`}>
                        {r.arcFlashBoundaryM.toFixed(1)}
                      </td>
                      <td className={`border-b px-2 py-1.5 ${tc.border}`}>
                        Cat {r.ppeCategory}
                      </td>
                      <td className={`border-b px-2 py-1.5 ${tc.border}`}>
                        <button
                          type="button"
                          title="Download printable arc-flash label"
                          className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 ${tc.btnBg} ${tc.btnHover}`}
                          onClick={() =>
                            downloadArcFlashLabel(r, circuit.name || 'circuit')
                          }
                        >
                          <FiDownload size={11} />
                          <span>.txt</span>
                        </button>
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
                  {learningMode && learningHintForIssue(issue) && (
                    <span
                      className={`mt-1.5 block rounded px-2 py-1.5 text-[10px] leading-snug ${
                        theme === 'dark'
                          ? 'bg-sky-950/40 text-sky-200'
                          : 'bg-sky-50 text-sky-900'
                      }`}
                    >
                      {learningHintForIssue(issue)}
                    </span>
                  )}
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
