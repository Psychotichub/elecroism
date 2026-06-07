import React, { useCallback, useMemo, useState } from 'react';
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
import { validateCrossSheetReferences } from '../../utils/crossSheetNavigation';
import { downloadCoordinationStudyPdf } from '../../utils/coordinationStudyReport';
import DesignatorToolsSection from './DesignatorToolsSection';
import DrawingExportSection from './DrawingExportSection';
import PanelScheduleSection from './PanelScheduleSection';
import SldViewSection from './SldViewSection';
import ReviewCommentsSection from './ReviewCommentsSection';
import ProjectSnapshotsSection from './ProjectSnapshotsSection';
import ComponentLibrarySection from './ComponentLibrarySection';
import PluginsSection from './PluginsSection';
import { useUiStore } from '../../store/uiStore';
import type { Circuit } from '../../types';
import {
  AppIcon,
  Button,
  PanelDataTable,
  PanelExportFooter,
  ValidationIssueRow,
} from '../ui';

function issueFocusLabel(
  issue: CircuitValidationIssue,
  circuit: Circuit
): string | undefined {
  const canFocus =
    issue.componentIds.length > 0 ||
    (issue.wireIds?.length ?? 0) > 0 ||
    issue.navigateRef;
  if (!canFocus) return undefined;
  if (issue.componentIds.length > 0) {
    const names = issue.componentIds
      .map((cid) => circuit.components.find((c) => c.id === cid)?.label)
      .filter(Boolean)
      .join(', ');
    return `Focus ${names}`;
  }
  if (issue.wireIds?.length) return 'Focus wire';
  if (issue.navigateRef) return 'Focus reference';
  return 'Focus';
}

const CircuitValidationPanel: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const circuit = useCircuitStore((s) => s.circuit);
  const project = useCircuitStore((s) => s.project);
  const simulationResult = useCircuitStore((s) => s.simulationResult);
  const setSelected = useCircuitStore((s) => s.setSelected);
  const focusValidationIssue = useCircuitStore((s) => s.focusValidationIssue);
  const setPhaseImbalanceWarningPercent = useCircuitStore(
    (s) => s.setPhaseImbalanceWarningPercent
  );
  const setContinuityPowerThresholdW = useCircuitStore(
    (s) => s.setContinuityPowerThresholdW
  );
  const learningMode = useUiStore((s) => s.learningMode);
  const toggleLearningMode = useUiStore((s) => s.toggleLearningMode);
  const [coordExportMsg, setCoordExportMsg] = useState<string | null>(null);

  const handleCoordinationPdf = useCallback(() => {
    setCoordExportMsg(null);
    try {
      downloadCoordinationStudyPdf(circuit, simulationResult);
      setCoordExportMsg('Coordination study PDF downloaded.');
    } catch (e) {
      setCoordExportMsg(e instanceof Error ? e.message : 'Export failed.');
    }
  }, [circuit, simulationResult]);

  const issues = useMemo(
    (): CircuitValidationIssue[] => [
      ...runCircuitDesignValidation(circuit, simulationResult),
      ...validateCrossSheetReferences(project),
    ],
    [circuit, simulationResult, project]
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
        <h2 className={`es-typo-title-sm ${tc.textBright}`}>
          Circuit validation
        </h2>
        <p className={`mt-1 es-typo-body-sm leading-snug ${tc.textMuted}`}>
          Static checks before you rely on the last simulation: supply topology,
          motor phases, PE vs N, BMS control readiness, comms addressing,
          protection coordination, cable vs breaker hints, and short-circuit
          breaking capacity, earth-fault loop impedance (Zs), and arc-flash
          incident energy estimates.
        </p>
        <label
          className={`mt-2 flex cursor-pointer items-center gap-2 es-typo-body-sm ${tc.text}`}
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
            className={`es-typo-caption ${tc.textMuted}`}
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
            className="input-field w-16 py-1 es-tabular-nums"
          />
          <label
            htmlFor="continuity-thresh-w"
            className={`ml-3 es-typo-caption ${tc.textMuted}`}
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
            className="input-field w-20 py-1 es-tabular-nums"
          />
        </div>
      </div>

      <div className="es-density-pad es-density-stack-loose min-h-0 flex-1 overflow-y-auto">
        <ComponentLibrarySection />
        <PluginsSection />
        <ProjectSnapshotsSection />
        <DrawingExportSection />
        <PanelScheduleSection />
        <ReviewCommentsSection />
        <SldViewSection />
        <DesignatorToolsSection />
        {coordination.rows.length > 0 && (
          <div>
            <h3
              className={`mb-1.5 es-typo-section ${tc.textMuted}`}
            >
              Protection coordination
            </h3>
            <p className={`mb-2 es-typo-caption leading-snug ${tc.textMuted}`}>
              Order is by shortest path (hops) from a supply live terminal to
              each device&apos;s line-side IN — parallel feeders may look odd.
              Export a PDF with TCC curves, device settings, fault levels, and
              margin notes.
            </p>
            <PanelDataTable minWidth={280}>
              <thead className="es-table-sticky-head">
                <tr>
                  <th>Device</th>
                  <th className="es-table-num">Iₙ (A)</th>
                  <th>Trip / type</th>
                  <th className="es-table-num">Hops</th>
                </tr>
              </thead>
              <tbody>
                {coordination.rows.map((r: ProtectionCoordinationRow) => (
                  <tr key={r.componentId}>
                    <td>
                      <button
                        type="button"
                        className="text-left font-medium text-es-bright underline-offset-2 hover:underline es-focus-ring"
                        onClick={() => setSelected(r.componentId)}
                      >
                        {r.label}
                      </button>
                      <span className="block font-normal text-es-secondary">
                        {r.deviceType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="es-table-num">
                      {r.ratedAmps != null ? r.ratedAmps : '—'}
                    </td>
                    <td>{r.tripOrFamily ?? '—'}</td>
                    <td className="es-table-num">
                      {r.minHopsFromLive != null ? r.minHopsFromLive : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </PanelDataTable>
          </div>
        )}

        {powerQuality.length > 0 && (
          <div>
            <h3
              className={`mb-1.5 es-typo-section ${tc.textMuted}`}
            >
              Power quality / harmonics
            </h3>
            <p className={`mb-2 es-typo-caption leading-snug ${tc.textMuted}`}>
              Nonlinear loads (SMPS, VFD) with configurable THD. Triplen (3rd-order)
              harmonics add in the neutral on 3φ + N — Σ I_N shown per load.
            </p>
            {simulationResult?.powerQualityNeutralHarmonicA != null &&
            simulationResult.powerQualityNeutralHarmonicA > 0 ? (
              <p className={`mb-2 es-typo-caption font-medium text-amber-400`}>
                Board Σ neutral harmonic ≈{' '}
                {simulationResult.powerQualityNeutralHarmonicA.toFixed(1)} A
              </p>
            ) : null}
            <PanelDataTable minWidth={300}>
              <thead className="es-table-sticky-head">
                <tr>
                  <th>Load</th>
                  <th className="es-table-num">THD %</th>
                  <th className="es-table-num">I₁ (A)</th>
                  <th className="es-table-num">I_rms (A)</th>
                  <th className="es-table-num">I_N h3 (A)</th>
                </tr>
              </thead>
              <tbody>
                {powerQuality.map((r: PowerQualityRow) => (
                  <tr key={r.componentId}>
                    <td>
                      <button
                        type="button"
                        className="text-left font-medium text-es-bright underline-offset-2 hover:underline es-focus-ring"
                        onClick={() => setSelected(r.componentId)}
                      >
                        {r.label}
                      </button>
                      <span className="block text-es-secondary">{r.deviceType}</span>
                    </td>
                    <td className="es-table-num">{r.thdPercent.toFixed(0)}</td>
                    <td className="es-table-num">
                      {r.fundamentalCurrentA.toFixed(2)}
                    </td>
                    <td className="es-table-num">{r.rmsCurrentA.toFixed(2)}</td>
                    <td className="es-table-num">
                      {r.triplenNeutralA.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </PanelDataTable>
          </div>
        )}

        {faultLevels.length > 0 && (
          <div>
            <h3
              className={`mb-1.5 es-typo-section ${tc.textMuted}`}
            >
              Prospective fault levels
            </h3>
            <p className={`mb-2 es-typo-caption leading-snug ${tc.textMuted}`}>
              Bolted short-circuit current from source impedance (Ze + feeder R)
              at each protection device. Used for breaking-capacity checks and
              arc-flash estimates.
            </p>
            <PanelDataTable minWidth={280}>
              <thead className="es-table-sticky-head">
                <tr>
                  <th>Device</th>
                  <th className="es-table-num">Zs (Ω)</th>
                  <th className="es-table-num">Isc (kA)</th>
                </tr>
              </thead>
              <tbody>
                {faultLevels.map((r: FaultLevelRow) => (
                  <tr key={r.deviceId}>
                    <td>
                      <button
                        type="button"
                        className="text-left font-medium text-es-bright underline-offset-2 hover:underline es-focus-ring"
                        onClick={() => setSelected(r.deviceId)}
                      >
                        {r.label}
                      </button>
                      <span className="block text-es-secondary">{r.deviceType}</span>
                    </td>
                    <td className="es-table-num">
                      {r.sourceImpedanceOhms.toFixed(3)}
                    </td>
                    <td className="es-table-num font-semibold">
                      {(r.faultCurrentA / 1000).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </PanelDataTable>
          </div>
        )}

        {earthFaultLoops.length > 0 && (
          <div>
            <h3
              className={`mb-1.5 es-typo-section ${tc.textMuted}`}
            >
              Earth-fault loop (Zs)
            </h3>
            <p className={`mb-2 es-typo-caption leading-snug ${tc.textMuted}`}>
              Zs = Ze + R₁ + R₂ from wire length and cross-section. Compared to
              max Zs for the upstream MCB/fuse (0.4 s / 5 s rules, simplified).
            </p>
            <PanelDataTable minWidth={320}>
              <thead className="es-table-sticky-head">
                <tr>
                  <th>Load</th>
                  <th>Protector</th>
                  <th className="es-table-num">Zs (Ω)</th>
                  <th className="es-table-num">Max</th>
                  <th className="es-table-num">Iₐ (A)</th>
                  <th>Rule</th>
                </tr>
              </thead>
              <tbody>
                {earthFaultLoops.map((r: EarthFaultLoopRow) => (
                  <tr key={r.loadId}>
                    <td>
                      <button
                        type="button"
                        className="text-left font-medium text-es-bright underline-offset-2 hover:underline es-focus-ring"
                        onClick={() => setSelected(r.loadId)}
                      >
                        {r.loadLabel}
                      </button>
                    </td>
                    <td>
                      {r.protectorLabel ? (
                        <button
                          type="button"
                          className="underline-offset-2 hover:underline es-focus-ring"
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
                        <span className="block text-es-secondary">
                          {r.ratedAmps} A {r.tripCurve ?? ''}
                        </span>
                      ) : null}
                    </td>
                    <td
                      className={`es-table-num ${
                        r.ok ? '' : 'font-semibold text-es-error'
                      }`}
                    >
                      {r.zsOhms.toFixed(2)}
                    </td>
                    <td className="es-table-num">
                      {r.maxZsOhms != null ? r.maxZsOhms.toFixed(2) : '—'}
                    </td>
                    <td className="es-table-num">
                      {r.faultCurrentA.toFixed(0)}
                    </td>
                    <td>{r.disconnectionRule}</td>
                  </tr>
                ))}
              </tbody>
            </PanelDataTable>
          </div>
        )}

        {arcFlashRows.length > 0 && (
          <div>
            <h3
              className={`mb-1.5 es-typo-section ${tc.textMuted}`}
            >
              Arc-flash (simplified)
            </h3>
            <p className={`mb-2 es-typo-caption leading-snug ${tc.textMuted}`}>
              Lee-equation estimate from bolted fault current, arc factor 50%,
              device clearing time, and 18 in working distance. Download a
              printable label per device.
            </p>
            <PanelDataTable minWidth={340}>
              <thead className="es-table-sticky-head">
                <tr>
                  <th>Device</th>
                  <th className="es-table-num">Ibf (kA)</th>
                  <th className="es-table-num">t (ms)</th>
                  <th className="es-table-num">E (cal/cm²)</th>
                  <th className="es-table-num">AFB (m)</th>
                  <th>PPE</th>
                  <th>Label</th>
                </tr>
              </thead>
              <tbody>
                {arcFlashRows.map((r: ArcFlashRow) => (
                  <tr key={r.deviceId}>
                    <td>
                      <button
                        type="button"
                        className="text-left font-medium text-es-bright underline-offset-2 hover:underline es-focus-ring"
                        onClick={() => setSelected(r.deviceId)}
                      >
                        {r.label}
                      </button>
                      <span className="block text-es-secondary">{r.deviceType}</span>
                    </td>
                    <td className="es-table-num">
                      {(r.boltedFaultCurrentA / 1000).toFixed(2)}
                    </td>
                    <td className="es-table-num">
                      {(r.clearingTimeS * 1000).toFixed(0)}
                    </td>
                    <td
                      className={`es-table-num font-semibold ${
                        r.ppeCategory >= '3'
                          ? 'text-es-error'
                          : r.ppeCategory === '2'
                            ? 'text-es-warning'
                            : ''
                      }`}
                    >
                      {r.incidentEnergyCalCm2.toFixed(1)}
                    </td>
                    <td className="es-table-num">
                      {r.arcFlashBoundaryM.toFixed(1)}
                    </td>
                    <td>Cat {r.ppeCategory}</td>
                    <td>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        title="Download printable arc-flash label"
                        onClick={() =>
                          downloadArcFlashLabel(r, circuit.name || 'circuit')
                        }
                      >
                        <AppIcon id="download" size="inline" />
                        .txt
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </PanelDataTable>
          </div>
        )}

        {issues.length === 0 ? (
          <p
            className={`rounded-md border px-3 py-4 text-center es-typo-body ${tc.border} ${theme === 'dark' ? 'border-emerald-900/50 bg-emerald-950/30 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}
          >
            No issues detected for the current checks. Run simulation after
            edits to refresh current-based wire warnings.
          </p>
        ) : (
          <ul className="space-y-2" data-testid="validation-issue-list">
            {issues.map((issue) => {
              const canFocus =
                issue.componentIds.length > 0 ||
                (issue.wireIds?.length ?? 0) > 0 ||
                !!issue.navigateRef;
              const hint =
                learningMode && learningHintForIssue(issue)
                  ? learningHintForIssue(issue)
                  : undefined;
              return (
                <li key={issue.id}>
                  <ValidationIssueRow
                    severity={issue.severity}
                    message={issue.message}
                    focusLabel={issueFocusLabel(issue, circuit)}
                    disabled={!canFocus}
                    onFocus={() => focusValidationIssue(issue)}
                    hint={hint}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {coordination.rows.length > 0 ? (
        <PanelExportFooter>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            onClick={handleCoordinationPdf}
          >
            <AppIcon id="export" size="inline" />
            Download coordination study PDF
          </Button>
          {coordExportMsg ? (
            <p className="es-typo-caption text-es-secondary">{coordExportMsg}</p>
          ) : null}
        </PanelExportFooter>
      ) : null}
    </div>
  );
};

export default CircuitValidationPanel;
