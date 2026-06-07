import React, { useState, useMemo, useCallback } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import {
  runCableSizingWizard,
  buildWireCableSizingRecord,
  evaluateAppliedCrossSection,
  INSTALLATION_METHOD_LABELS,
  type CableSizingInput,
  type CableSizingResult,
  type InstallationMethod,
  type ConductorMaterial,
  type PhaseConfig,
} from '../../utils/cableSizingWizard';
import { downloadCableScheduleCsv } from '../../utils/cableScheduleExport';
import { FiCheck, FiX, FiZap, FiArrowRight } from 'react-icons/fi';
import { wireLengthMeters } from '../../simulation/cableImpedance';

// ---------------------------------------------------------------------------
// Storage key for sticky wizard defaults
// ---------------------------------------------------------------------------
const WIZARD_STORAGE_KEY = 'electroism.cableSizingWizard.v1';

interface WizardDefaults {
  loadKw: number;
  distanceM: number;
  voltageV: number;
  powerFactor: number;
  phaseConfig: PhaseConfig;
  installationMethod: InstallationMethod;
  conductorMaterial: ConductorMaterial;
  maxVoltageDropPct: number;
  ambientTempC: number;
  circuitsInGroup: number;
}

function loadDefaults(): WizardDefaults {
  const base: WizardDefaults = {
    loadKw: 5,
    distanceM: 30,
    voltageV: 230,
    powerFactor: 0.85,
    phaseConfig: 'single_phase',
    installationMethod: 'clipped_direct',
    conductorMaterial: 'copper',
    maxVoltageDropPct: 3,
    ambientTempC: 30,
    circuitsInGroup: 1,
  };
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { ...base, ...(parsed as Partial<WizardDefaults>) };
      }
    }
  } catch {
    /* ignore */
  }
  return base;
}

function saveDefaults(d: WizardDefaults) {
  try {
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CableSizingWizardPanel: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const circuit = useCircuitStore((s) => s.circuit);
  const selectedId = useCircuitStore((s) => s.selectedId);
  const updateWire = useCircuitStore((s) => s.updateWire);

  // Form state
  const [defs, setDefs] = useState<WizardDefaults>(loadDefaults);
  const updateField = useCallback(
    <K extends keyof WizardDefaults>(key: K, value: WizardDefaults[K]) => {
      setDefs((prev) => {
        const next = { ...prev, [key]: value };
        saveDefaults(next);
        return next;
      });
    },
    []
  );

  // Which wire to apply result to
  const selectedWire = useMemo(
    () => circuit.wires.find((w) => w.id === selectedId),
    [circuit.wires, selectedId]
  );

  // Power wires only (for the dropdown)
  const powerWires = useMemo(
    () =>
      circuit.wires.filter(
        (w) => !w.wireCategory || w.wireCategory === 'power'
      ),
    [circuit.wires]
  );

  const [manualTargetWireId, setManualTargetWireId] = useState('');

  // Derive the effective target: canvas-selected wire wins, else manual pick.
  const targetWireId = selectedWire ? selectedWire.id : manualTargetWireId;
  const setTargetWireId = setManualTargetWireId;

  const selectedWireLengthM = useMemo(() => {
    if (!selectedWire) return null;
    return wireLengthMeters(selectedWire.points, circuit.gridSize);
  }, [selectedWire, circuit.gridSize]);

  // Run the calculation
  const input: CableSizingInput = useMemo(
    () => ({
      loadKw: defs.loadKw,
      distanceM:
        selectedWireLengthM != null && selectedWireLengthM > 0
          ? Math.round(selectedWireLengthM * 10) / 10
          : defs.distanceM,
      voltageV: defs.voltageV,
      powerFactor: defs.powerFactor,
      phaseConfig: defs.phaseConfig,
      installationMethod: defs.installationMethod,
      conductorMaterial: defs.conductorMaterial,
      maxVoltageDropPct: defs.maxVoltageDropPct,
      ambientTempC: defs.ambientTempC,
      circuitsInGroup: defs.circuitsInGroup,
    }),
    [defs, selectedWireLengthM]
  );

  const result: CableSizingResult = useMemo(
    () => runCableSizingWizard(input),
    [input]
  );

  const targetWire = useMemo(
    () => circuit.wires.find((w) => w.id === targetWireId),
    [circuit.wires, targetWireId]
  );

  const appliedEvaluation = useMemo(() => {
    if (!targetWire) return null;
    return evaluateAppliedCrossSection(targetWire.crossSection, input);
  }, [targetWire, input]);

  const persistSizingToWire = useCallback(
    (wireId: string, crossMm2?: number) => {
      updateWire(wireId, {
        ...(crossMm2 != null ? { crossSection: crossMm2 } : {}),
        cableSizing: buildWireCableSizingRecord(input, result),
      });
    },
    [input, result, updateWire]
  );

  const applyRecommended = useCallback(() => {
    if (!result.recommended || !targetWireId) return;
    persistSizingToWire(targetWireId, result.recommended.crossSectionMm2);
  }, [result.recommended, targetWireId, persistSizingToWire]);

  const applyCandidate = useCallback(
    (crossMm2: number) => {
      if (!targetWireId) return;
      persistSizingToWire(targetWireId, crossMm2);
    },
    [targetWireId, persistSizingToWire]
  );

  const saveSizingRecordOnly = useCallback(() => {
    if (!targetWireId) return;
    persistSizingToWire(targetWireId);
  }, [targetWireId, persistSizingToWire]);

  const wiresWithSizing = useMemo(
    () => circuit.wires.filter((w) => w.cableSizing).length,
    [circuit.wires]
  );

  // ---- input field helper ----
  const numInput = (
    id: string,
    label: string,
    field: keyof WizardDefaults,
    opts?: { min?: number; max?: number; step?: number; unit?: string }
  ) => (
    <div className="flex items-center gap-2">
      <label
        htmlFor={id}
        className={`shrink-0 text-[11px] w-[110px] text-right ${tc.textMuted}`}
      >
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={opts?.min ?? 0}
        max={opts?.max}
        step={opts?.step ?? 1}
        value={defs[field]}
        onChange={(e) =>
          updateField(field, Math.max(opts?.min ?? 0, Number(e.target.value) || 0) as never)
        }
        className="input-field flex-1 py-1 text-xs tabular-nums"
      />
      {opts?.unit && (
        <span className={`shrink-0 text-[10px] w-6 ${tc.textMuted}`}>
          {opts.unit}
        </span>
      )}
    </div>
  );

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col overflow-hidden ${tc.panel} ${tc.text}`}
    >
      {/* ── Header ── */}
      <div className={`shrink-0 border-b px-3 py-3 ${tc.border}`}>
        <h2 className={`text-sm font-bold ${tc.textBright} flex items-center gap-1.5`}>
          <FiZap className="text-amber-400" aria-hidden />
          Cable sizing &amp; voltage drop wizard
        </h2>
        <p className={`mt-1 text-[11px] leading-snug ${tc.textMuted}`}>
          Enter load parameters. The wizard recommends the smallest standard
          cable cross-section that satisfies both ampacity (IEC 60364-5-52
          simplified) and your voltage drop limit.
          {selectedWireLengthM != null && selectedWireLengthM > 0 ? (
            <>
              {' '}
              Run length from selected wire:{' '}
              <strong>{selectedWireLengthM.toFixed(1)} m</strong>.
            </>
          ) : null}
        </p>
      </div>

      {/* ── Scrollable body ── */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-4">
        {/* ─── Input form ─── */}
        <div
          className={`rounded-md border p-2.5 space-y-2 ${tc.border} ${
            theme === 'dark' ? 'bg-black/20' : 'bg-gray-50'
          }`}
        >
          <h3
            className={`text-[11px] font-bold uppercase tracking-wide ${tc.textMuted}`}
          >
            Load &amp; cable parameters
          </h3>

          {numInput('csw-kw', 'Load power', 'loadKw', {
            min: 0.01,
            step: 0.5,
            unit: 'kW',
          })}
          {numInput('csw-dist', 'Cable length', 'distanceM', {
            min: 1,
            step: 1,
            unit: 'm',
          })}
          {numInput('csw-v', 'Voltage', 'voltageV', {
            min: 1,
            step: 10,
            unit: 'V',
          })}
          {numInput('csw-pf', 'Power factor', 'powerFactor', {
            min: 0.05,
            max: 1,
            step: 0.01,
          })}
          {numInput('csw-vd', 'Max V-drop', 'maxVoltageDropPct', {
            min: 0.5,
            max: 20,
            step: 0.5,
            unit: '%',
          })}
          {numInput('csw-temp', 'Ambient temp', 'ambientTempC', {
            min: -20,
            max: 65,
            step: 1,
            unit: '°C',
          })}
          {numInput('csw-group', 'Circuits grouped', 'circuitsInGroup', {
            min: 1,
            max: 20,
            step: 1,
          })}

          {/* Phase config */}
          <div className="flex items-center gap-2">
            <span
              className={`shrink-0 text-[11px] w-[110px] text-right ${tc.textMuted}`}
            >
              Phase config
            </span>
            <div className="flex gap-1 flex-1">
              {(
                [
                  { v: 'single_phase', l: '1φ' },
                  { v: 'three_phase', l: '3φ' },
                ] as const
              ).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => {
                    updateField('phaseConfig', o.v);
                    if (o.v === 'three_phase' && defs.voltageV <= 240) {
                      updateField('voltageV', 400);
                    } else if (o.v === 'single_phase' && defs.voltageV >= 400) {
                      updateField('voltageV', 230);
                    }
                  }}
                  className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    defs.phaseConfig === o.v
                      ? 'bg-blue-600 text-white'
                      : `${tc.btnBg} ${tc.btnHover} ${tc.text}`
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          {/* Installation method */}
          <div className="flex items-center gap-2">
            <span
              className={`shrink-0 text-[11px] w-[110px] text-right ${tc.textMuted}`}
            >
              Installation
            </span>
            <select
              value={defs.installationMethod}
              onChange={(e) =>
                updateField(
                  'installationMethod',
                  e.target.value as InstallationMethod
                )
              }
              className="input-field flex-1 py-1 text-xs"
            >
              {(
                Object.entries(INSTALLATION_METHOD_LABELS) as [
                  InstallationMethod,
                  string,
                ][]
              ).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* Material */}
          <div className="flex items-center gap-2">
            <span
              className={`shrink-0 text-[11px] w-[110px] text-right ${tc.textMuted}`}
            >
              Conductor
            </span>
            <div className="flex gap-1 flex-1">
              {(
                [
                  { v: 'copper', l: 'Cu' },
                  { v: 'aluminium', l: 'Al' },
                ] as const
              ).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => updateField('conductorMaterial', o.v)}
                  className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    defs.conductorMaterial === o.v
                      ? 'bg-blue-600 text-white'
                      : `${tc.btnBg} ${tc.btnHover} ${tc.text}`
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Result summary ─── */}
        <div
          className={`rounded-md border p-2.5 ${tc.border} ${
            result.recommended
              ? theme === 'dark'
                ? 'border-emerald-900/50 bg-emerald-950/30'
                : 'border-emerald-200 bg-emerald-50'
              : theme === 'dark'
                ? 'border-amber-900/50 bg-amber-950/30'
                : 'border-amber-200 bg-amber-50'
          }`}
        >
          <h3
            className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${
              result.recommended
                ? theme === 'dark'
                  ? 'text-emerald-300'
                  : 'text-emerald-800'
                : theme === 'dark'
                  ? 'text-amber-300'
                  : 'text-amber-800'
            }`}
          >
            {result.recommended ? '✓ Recommendation' : '⚠ No suitable size'}
          </h3>
          <p
            className={`text-[11px] leading-snug ${
              result.recommended
                ? theme === 'dark'
                  ? 'text-emerald-200'
                  : 'text-emerald-900'
                : theme === 'dark'
                  ? 'text-amber-200'
                  : 'text-amber-900'
            }`}
          >
            {result.summary}
          </p>

          {/* Derating breakdown */}
          <div
            className={`mt-2 grid grid-cols-4 gap-1 text-center text-[10px] ${
              theme === 'dark' ? 'text-emerald-100/80' : 'text-emerald-900/80'
            }`}
          >
            <div className={`rounded px-1 py-1 ${theme === 'dark' ? 'bg-black/20' : 'bg-white/60'}`}>
              <div className="font-semibold">×{result.derating.methodK.toFixed(2)}</div>
              <div className="opacity-70">Method</div>
            </div>
            <div className={`rounded px-1 py-1 ${theme === 'dark' ? 'bg-black/20' : 'bg-white/60'}`}>
              <div className="font-semibold">×{result.derating.tempK.toFixed(2)}</div>
              <div className="opacity-70">Temp</div>
            </div>
            <div className={`rounded px-1 py-1 ${theme === 'dark' ? 'bg-black/20' : 'bg-white/60'}`}>
              <div className="font-semibold">×{result.derating.groupingK.toFixed(2)}</div>
              <div className="opacity-70">Group</div>
            </div>
            <div className={`rounded px-1 py-1 ${theme === 'dark' ? 'bg-black/20' : 'bg-white/60'}`}>
              <div className="font-semibold">×{result.derating.combinedK.toFixed(2)}</div>
              <div className="opacity-70">Total</div>
            </div>
          </div>

          {appliedEvaluation && !appliedEvaluation.ok && (
            <p
              className={`mt-2 rounded px-2 py-1.5 text-[10px] leading-snug ${
                theme === 'dark'
                  ? 'bg-red-950/40 text-red-200 border border-red-900/50'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              Selected wire ({targetWire?.crossSection} mm²) is insufficient after
              derating: Iz ≈ {appliedEvaluation.deratedAmpacity.toFixed(0)} A vs load{' '}
              {appliedEvaluation.loadCurrentA.toFixed(1)} A
              {appliedEvaluation.voltageDropPct > input.maxVoltageDropPct
                ? `; ΔV ${appliedEvaluation.voltageDropPct.toFixed(1)} %`
                : ''}
              .
            </p>
          )}

          {/* Quick stats */}
          {result.recommended && (
            <div
              className={`mt-2 grid grid-cols-3 gap-1 text-center text-[10px] ${
                theme === 'dark' ? 'text-emerald-100' : 'text-emerald-900'
              }`}
            >
              <div className={`rounded px-1 py-1 ${theme === 'dark' ? 'bg-emerald-900/40' : 'bg-emerald-100'}`}>
                <div className="font-semibold text-xs">
                  {result.recommended.crossSectionMm2} mm²
                </div>
                <div className="opacity-70">Cable size</div>
              </div>
              <div className={`rounded px-1 py-1 ${theme === 'dark' ? 'bg-emerald-900/40' : 'bg-emerald-100'}`}>
                <div className="font-semibold text-xs">
                  {result.recommended.voltageDropPct.toFixed(1)}%
                </div>
                <div className="opacity-70">V-drop</div>
              </div>
              <div className={`rounded px-1 py-1 ${theme === 'dark' ? 'bg-emerald-900/40' : 'bg-emerald-100'}`}>
                <div className="font-semibold text-xs">
                  {result.recommended.deratedAmpacity.toFixed(0)} A
                </div>
                <div className="opacity-70">Ampacity</div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Apply to wire ─── */}
        {result.recommended && (
          <div
            className={`rounded-md border p-2.5 space-y-2 ${tc.border} ${
              theme === 'dark' ? 'bg-black/20' : 'bg-gray-50'
            }`}
          >
            <h3
              className={`text-[11px] font-bold uppercase tracking-wide ${tc.textMuted}`}
            >
              Apply to wire
            </h3>
            <select
              value={targetWireId}
              onChange={(e) => setTargetWireId(e.target.value)}
              className="input-field w-full py-1 text-xs"
            >
              <option value="">— Select a wire —</option>
              {powerWires.map((w) => {
                const name =
                  w.wireLabel || w.wireNumber || `Wire ${w.id.slice(0, 8)}`;
                return (
                  <option key={w.id} value={w.id}>
                    {name} ({w.crossSection} mm²)
                  </option>
                );
              })}
            </select>
            <button
              type="button"
              disabled={!targetWireId}
              onClick={applyRecommended}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-semibold transition-colors ${
                targetWireId
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : `${tc.btnBg} ${tc.textMuted} cursor-not-allowed`
              }`}
            >
              <FiArrowRight aria-hidden />
              Apply {result.recommended.crossSectionMm2} mm² to wire
            </button>
            <button
              type="button"
              disabled={!targetWireId}
              onClick={saveSizingRecordOnly}
              className={`w-full px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                targetWireId
                  ? `${tc.btnBg} ${tc.btnHover} ${tc.text}`
                  : `${tc.btnBg} ${tc.textMuted} cursor-not-allowed`
              }`}
            >
              Save wizard result (keep current mm²)
            </button>
            <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
              Apply updates cross-section and saves sizing data for the cable
              schedule. {wiresWithSizing} wire
              {wiresWithSizing === 1 ? '' : 's'} have saved wizard results.
            </p>
          </div>
        )}

        {/* ─── Cable schedule export ─── */}
        <div
          className={`rounded-md border p-2.5 space-y-2 ${tc.border} ${
            theme === 'dark' ? 'bg-black/20' : 'bg-gray-50'
          }`}
        >
          <h3
            className={`text-[11px] font-bold uppercase tracking-wide ${tc.textMuted}`}
          >
            Cable schedule
          </h3>
          <p className={`text-[10px] leading-snug ${tc.textMuted}`}>
            Export a CSV with wire endpoints, applied mm², and persisted wizard
            fields (load, length, Iz, ΔV) per wire.
          </p>
          <button
            type="button"
            onClick={() =>
              downloadCableScheduleCsv(circuit, circuit.name || 'circuit')
            }
            className="w-full rounded bg-indigo-700 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-600"
          >
            Download cable schedule CSV
          </button>
        </div>

        {/* ─── Full candidate table ─── */}
        <div>
          <h3
            className={`mb-1.5 text-[11px] font-bold uppercase tracking-wide ${tc.textMuted}`}
          >
            All candidates
          </h3>
          <p className={`mb-2 text-[10px] leading-snug ${tc.textMuted}`}>
            Click a row to apply that size to the selected wire.
          </p>
          <div className={`overflow-x-auto rounded-md border ${tc.border}`}>
            <table className="w-full min-w-[340px] border-collapse text-left text-[10px]">
              <thead>
                <tr
                  className={
                    theme === 'dark' ? 'bg-white/5' : 'bg-black/[0.03]'
                  }
                >
                  <th
                    className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}
                  >
                    mm²
                  </th>
                  <th
                    className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}
                  >
                    Iz (A)
                  </th>
                  <th
                    className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}
                  >
                    ΔV (V)
                  </th>
                  <th
                    className={`border-b px-2 py-1.5 font-semibold ${tc.border}`}
                  >
                    ΔV %
                  </th>
                  <th
                    className={`border-b px-2 py-1.5 font-semibold text-center ${tc.border}`}
                  >
                    OK
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.candidates.map((c) => {
                  const isRec =
                    result.recommended?.crossSectionMm2 ===
                    c.crossSectionMm2;
                  return (
                    <tr
                      key={c.crossSectionMm2}
                      className={`cursor-pointer transition-colors ${
                        isRec
                          ? theme === 'dark'
                            ? 'bg-emerald-900/30 hover:bg-emerald-900/50'
                            : 'bg-emerald-50 hover:bg-emerald-100'
                          : theme === 'dark'
                            ? 'hover:bg-white/5'
                            : 'hover:bg-black/[0.03]'
                      }`}
                      onClick={() =>
                        targetWireId &&
                        applyCandidate(c.crossSectionMm2)
                      }
                      title={
                        targetWireId
                          ? `Click to apply ${c.crossSectionMm2} mm²`
                          : 'Select a wire first'
                      }
                    >
                      <td
                        className={`border-b px-2 py-1.5 font-medium tabular-nums ${tc.border} ${
                          isRec
                            ? theme === 'dark'
                              ? 'text-emerald-300'
                              : 'text-emerald-700'
                            : ''
                        }`}
                      >
                        {c.crossSectionMm2}
                        {isRec && (
                          <span className="ml-1 text-[8px] font-bold opacity-70">
                            ★
                          </span>
                        )}
                      </td>
                      <td
                        className={`border-b px-2 py-1.5 tabular-nums ${tc.border} ${
                          c.deratedAmpacity < c.loadCurrentA
                            ? 'text-red-400'
                            : ''
                        }`}
                      >
                        {c.deratedAmpacity.toFixed(0)}
                      </td>
                      <td
                        className={`border-b px-2 py-1.5 tabular-nums ${tc.border}`}
                      >
                        {c.voltageDropV.toFixed(1)}
                      </td>
                      <td
                        className={`border-b px-2 py-1.5 tabular-nums ${tc.border} ${
                          c.voltageDropPct > input.maxVoltageDropPct
                            ? 'text-red-400'
                            : ''
                        }`}
                      >
                        {c.voltageDropPct.toFixed(1)}
                      </td>
                      <td
                        className={`border-b px-2 py-1.5 text-center ${tc.border}`}
                      >
                        {c.ok ? (
                          <FiCheck
                            className="inline text-emerald-400"
                            aria-label="Pass"
                          />
                        ) : (
                          <FiX
                            className="inline text-red-400"
                            aria-label="Fail"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className={`mt-1.5 text-[10px] ${tc.textMuted} leading-snug`}>
            Iz = derated ampacity; ΔV = voltage drop over {defs.distanceM} m
            run. Load current ≈ {result.loadCurrentA.toFixed(1)} A. Values are
            simplified IEC 60364 hints — always verify with local standards.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CableSizingWizardPanel;
