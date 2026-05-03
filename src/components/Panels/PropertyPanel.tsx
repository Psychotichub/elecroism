import { TypeSpecificProps } from './propertyPanel/TypeSpecificProps';
import * as WireEditor from './propertyPanel/editors/WireEditor';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import type { ComponentProperties, PhaseSystem } from '../../types';
import { clampComponentScale } from '../../utils/geometry';
import {
  COMPONENT_PANEL_DESCRIPTIONS,
  formatComponentPanelHelpText,
} from '../../utils/componentPanelInfo';
import { defaultPhaseSystemForType } from './propertyPanel/constants';
import { Label } from './propertyPanel/PropertyPanelLabel';
import {
  PropertyPanelProvider,
  type PropertyPanelContextValue,
} from './propertyPanel/PropertyPanelContext';

const PropertyPanel: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];

  const {
    circuit,
    selectedId,
    simulationResult,
    updateComponent,
    setComponentPhaseSystem,
    setMcbPoleLayout,
    updateWire,
    toggleComponent,
    resetTripped,
    removeComponent,
    rotateComponent,
    duplicateComponent,
    acbBmsClosePulse,
    acbBmsShuntOpen,
    mccbBmsMotorClosePulse,
    mccbBmsShuntOpen,
  } = useCircuitStore();

  const selectedComp = circuit.components.find(
    (c) => c.id === selectedId
  );
  const selectedWire = circuit.wires.find((w) => w.id === selectedId);

  useEffect(() => {
    if (!selectedId) return;
    const c = useCircuitStore
      .getState()
      .circuit.components.find((x) => x.id === selectedId);
    if (!c || c.type !== 'mcb') return;
    const p = c.properties.poles;
    if (p !== undefined && p > 2) {
      useCircuitStore.getState().updateComponent(c.id, {
        properties: { ...c.properties, poles: 2 },
      });
    }
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const c = useCircuitStore
      .getState()
      .circuit.components.find((x) => x.id === selectedId);
    if (!c || (c.type !== 'rcd' && c.type !== 'residual_current_circuit_breaker')) {
      return;
    }
    const poles = c.properties.poles ?? 2;
    const expected =
      poles >= 4
        ? [
          { x: -30, y: -25, label: '1' },
          { x: -30, y: 25, label: '2' },
          { x: -10, y: -25, label: '3' },
          { x: -10, y: 25, label: '4' },
          { x: 10, y: -25, label: '5' },
          { x: 10, y: 25, label: '6' },
          { x: 30, y: -25, label: '7' },
          { x: 30, y: 25, label: '8' },
        ]
        : [
          { x: -10, y: -25, label: '1' },
          { x: -10, y: 25, label: '2' },
          { x: 10, y: -25, label: '3' },
          { x: 10, y: 25, label: '4' },
        ];
    const same =
      c.connectionPoints.length === expected.length &&
      expected.every(
        (ep, idx) =>
          c.connectionPoints[idx]?.x === ep.x &&
          c.connectionPoints[idx]?.y === ep.y &&
          c.connectionPoints[idx]?.label === ep.label
      );
    if (same) return;
    useCircuitStore.getState().updateComponent(c.id, {
      properties: {
        ...c.properties,
        poles: poles >= 4 ? 4 : 2,
        phaseSystem: poles >= 4 ? 'three_phase' : 'single_phase',
      },
      connectionPoints: expected.map((pt) => ({
        id: crypto.randomUUID(),
        componentId: c.id,
        x: pt.x,
        y: pt.y,
        label: pt.label,
      })),
    });
  }, [selectedId]);

  const nodeResult =
    selectedComp && simulationResult?.nodes[selectedComp.id] != null
      ? simulationResult.nodes[selectedComp.id]
      : null;

  const updateProp = useCallback(
    (
      updates: Partial<ComponentProperties> & {
        multimeterSignal?: 'auto' | 'ac' | 'dc';
      }
    ) => {
      if (!selectedComp) return;
      updateComponent(selectedComp.id, {
        properties: { ...selectedComp.properties, ...updates },
      });
    },
    [selectedComp, updateComponent]
  );

  const panelCtx = useMemo<PropertyPanelContextValue>(
    () => ({
      theme,
      tc,
      selectedComp,
      selectedWire,
      nodeResult,
      circuit,
      updateProp,
      updateComponent,
      updateWire,
      toggleComponent,
      resetTripped,
      removeComponent,
      rotateComponent,
      duplicateComponent,
      setComponentPhaseSystem,
      setMcbPoleLayout,
      acbBmsClosePulse,
      acbBmsShuntOpen,
      mccbBmsMotorClosePulse,
      mccbBmsShuntOpen,
    }),
    [
      theme,
      tc,
      selectedComp,
      selectedWire,
      nodeResult,
      circuit,
      updateProp,
      updateComponent,
      updateWire,
      toggleComponent,
      resetTripped,
      removeComponent,
      rotateComponent,
      duplicateComponent,
      setComponentPhaseSystem,
      setMcbPoleLayout,
      acbBmsClosePulse,
      acbBmsShuntOpen,
      mccbBmsMotorClosePulse,
      mccbBmsShuntOpen,
    ]
  );

  if (!selectedComp && !selectedWire) {
    return (
      <div
        className={`flex w-full min-w-0 flex-col items-center justify-center p-4 ${tc.text}`}
      >
        <p className={`text-sm ${tc.textMuted}`}>Select a component</p>
      </div>
    );
  }

  const componentPanelInfo = selectedComp
    ? COMPONENT_PANEL_DESCRIPTIONS[selectedComp.type]
    : null;

  return (
    <PropertyPanelProvider value={panelCtx}>
    <div
      className={`flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden ${tc.text}`}
    >
      <div className={`px-3 py-3 border-b ${tc.border}`}>
        <h2 className={`text-xs font-bold ${tc.textBright}`}>Properties</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {selectedComp && (
          <>
            <Label text="Label">
              <input
                type="text"
                value={selectedComp.label}
                onChange={(e) =>
                  updateComponent(selectedComp.id, {
                    label: e.target.value,
                  })
                }
                className="input-field"
              />
            </Label>
            <Label text="Label text size">
              <input
                type="number"
                value={selectedComp.properties.labelFontSize ?? 8}
                onChange={(e) =>
                  updateProp({
                    labelFontSize: Math.min(
                      24,
                      Math.max(6, Number(e.target.value) || 8)
                    ),
                  })
                }
                className="input-field"
                min={6}
                max={24}
              />
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Label text="Label X offset">
                <input
                  type="number"
                  value={selectedComp.properties.labelOffsetX ?? 0}
                  onChange={(e) =>
                    updateProp({ labelOffsetX: Number(e.target.value) || 0 })
                  }
                  className="input-field"
                />
              </Label>
              <Label text="Label Y offset">
                <input
                  type="number"
                  value={selectedComp.properties.labelOffsetY ?? 0}
                  onChange={(e) =>
                    updateProp({ labelOffsetY: Number(e.target.value) || 0 })
                  }
                  className="input-field"
                />
              </Label>
            </div>

            <Label text="Type">
              <span className={`text-xs ${tc.textMuted} capitalize`}>
                {selectedComp.type.replace(/_/g, ' ')}
              </span>
            </Label>

            {componentPanelInfo && (
              <div
                className={`rounded-md border p-2.5 space-y-2 ${tc.border} ${theme === 'dark' ? 'bg-black/25' : 'bg-gray-50'}`}
                aria-label={formatComponentPanelHelpText(componentPanelInfo)}
              >
                <h3 className={`text-xs font-semibold ${tc.textBright}`}>
                  {componentPanelInfo.displayName}
                </h3>
                <p className={`text-[11px] leading-snug ${tc.text}`}>
                  {componentPanelInfo.description}
                </p>
                <div>
                  <p
                    className={`text-[10px] uppercase tracking-wide ${tc.textMuted} mb-1`}
                  >
                    Features
                  </p>
                  <ul
                    className={`text-[11px] leading-snug list-disc list-inside space-y-0.5 ${tc.text}`}
                  >
                    {componentPanelInfo.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p
                    className={`text-[10px] uppercase tracking-wide ${tc.textMuted} mb-0.5`}
                  >
                    Purpose
                  </p>
                  <p className={`text-[11px] leading-snug ${tc.text}`}>
                    {componentPanelInfo.purpose}
                  </p>
                </div>
              </div>
            )}

            <Label text="Visual scale">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0.25}
                  max={4}
                  step={0.05}
                  value={selectedComp.scale ?? 1}
                  onChange={(e) =>
                    updateComponent(selectedComp.id, {
                      scale: clampComponentScale(Number(e.target.value)),
                    })
                  }
                  className="flex-1 min-w-0 accent-blue-600"
                />
                <span className={`text-xs font-mono w-11 shrink-0 ${tc.textMuted}`}>
                  {(selectedComp.scale ?? 1).toFixed(2)}×
                </span>
              </div>
            </Label>

            <Label text="Phase system">
              <select
                value={
                  (selectedComp.properties.phaseSystem ??
                    defaultPhaseSystemForType(selectedComp.type)) as PhaseSystem
                }
                onChange={(e) =>
                  setComponentPhaseSystem(
                    selectedComp.id,
                    e.target.value as PhaseSystem
                  )
                }
                className="input-field"
              >
                <option value="single_phase">Single-phase</option>
                <option value="three_phase">Three-phase</option>
              </select>
            </Label>
            <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
              Supply / MCB / contactor: switching phase may replace the symbol
              and remap L1/N (extra phase wires removed). Motors: with
              three-phase set, line current uses P/(√3·U<sub>L-L</sub>·PF); a
              1φ motor symbol uses ×1.25. A 3φ motor set to single-phase uses
              P/(U<sub>L-N</sub>·PF)·1.25.
            </p>

            <TypeSpecificProps />

            <div className="flex gap-1 pt-2">
              <button
                onClick={() => rotateComponent(selectedComp.id)}
                className={`flex-1 px-2 py-1.5 ${tc.btnBg} ${tc.btnText} rounded text-xs ${tc.btnHover}`}
              >
                Rotate
              </button>
              <button
                onClick={() => duplicateComponent(selectedComp.id)}
                className={`flex-1 px-2 py-1.5 ${tc.btnBg} ${tc.btnText} rounded text-xs ${tc.btnHover}`}
              >
                Duplicate
              </button>
              <button
                onClick={() => removeComponent(selectedComp.id)}
                className="flex-1 px-2 py-1.5 bg-red-700 text-white rounded text-xs hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </>
        )}

        {selectedWire && <WireEditor.WirePropsContent />}
      </div>

      {nodeResult && (
        <div className={`p-3 border-t ${tc.border} space-y-1`}>
          <h3 className={`text-xs font-semibold ${tc.textMuted} uppercase`}>
            Simulation
          </h3>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {selectedComp && (
              <>
                <span className={tc.textMuted}>Phase (set):</span>
                <span>
                  {(selectedComp.properties.phaseSystem ??
                    defaultPhaseSystemForType(selectedComp.type)) ===
                    'three_phase'
                    ? 'Three-phase'
                    : 'Single-phase'}
                </span>
              </>
            )}
            <span className={tc.textMuted}>Voltage:</span>
            <span>{nodeResult.voltageV.toFixed(1)}V</span>
            <span className={tc.textMuted}>Current:</span>
            <span>{nodeResult.currentA.toFixed(2)}A</span>
            <span className={tc.textMuted}>Power:</span>
            <span>{nodeResult.powerW.toFixed(1)}W</span>
            {nodeResult.powerFactor !== undefined && (
              <>
                <span className={tc.textMuted}>PF:</span>
                <span>{nodeResult.powerFactor.toFixed(2)}</span>
              </>
            )}
            {nodeResult.lineVoltageRmsV !== undefined && (
              <>
                <span className={tc.textMuted}>U_L-L:</span>
                <span>{nodeResult.lineVoltageRmsV.toFixed(1)}V</span>
              </>
            )}
            {nodeResult.phaseVoltageRmsV !== undefined && (
              <>
                <span className={tc.textMuted}>U_L-N:</span>
                <span>{nodeResult.phaseVoltageRmsV.toFixed(1)}V</span>
              </>
            )}
            {nodeResult.lineCurrentRmsA !== undefined && (
              <>
                <span className={tc.textMuted}>I_line:</span>
                <span>{nodeResult.lineCurrentRmsA.toFixed(2)}A</span>
              </>
            )}
            {nodeResult.voltageL1NV !== undefined && (
              <>
                <div className={`col-span-2 mt-2 border-t pt-2 ${tc.border}`}>
                  <p
                    className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wide ${tc.textMuted}`}
                  >
                    Three-phase results
                  </p>
                  <p className={`mb-2 text-[10px] leading-snug ${tc.textMuted}`}>
                    Symmetric supply by default. On 3φ motors set per-phase power (W)
                    for uneven 4-wire loads, or use current factors; I_N uses phasor
                    sum with per-phase PF angles. Validation warns if imbalance
                    exceeds the threshold set under the Validation tab.
                  </p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
                    <span className={tc.textMuted}>I_L1:</span>
                    <span>{(nodeResult.currentL1A ?? 0).toFixed(2)} A</span>
                    <span className={tc.textMuted}>I_L2:</span>
                    <span>{(nodeResult.currentL2A ?? 0).toFixed(2)} A</span>
                    <span className={tc.textMuted}>I_L3:</span>
                    <span>{(nodeResult.currentL3A ?? 0).toFixed(2)} A</span>
                    <span className={tc.textMuted}>I_N:</span>
                    <span>{(nodeResult.currentNeutralA ?? 0).toFixed(2)} A</span>
                    <span className={tc.textMuted}>U_L1-N:</span>
                    <span>{(nodeResult.voltageL1NV ?? 0).toFixed(1)} V</span>
                    <span className={tc.textMuted}>U_L2-N:</span>
                    <span>{(nodeResult.voltageL2NV ?? 0).toFixed(1)} V</span>
                    <span className={tc.textMuted}>U_L3-N:</span>
                    <span>{(nodeResult.voltageL3NV ?? 0).toFixed(1)} V</span>
                    <span className={tc.textMuted}>U_L1-L2:</span>
                    <span>{(nodeResult.voltageL1L2V ?? 0).toFixed(1)} V</span>
                    <span className={tc.textMuted}>U_L2-L3:</span>
                    <span>{(nodeResult.voltageL2L3V ?? 0).toFixed(1)} V</span>
                    <span className={tc.textMuted}>U_L3-L1:</span>
                    <span>{(nodeResult.voltageL3L1V ?? 0).toFixed(1)} V</span>
                  </div>
                </div>
              </>
            )}
            <span className={tc.textMuted}>Status:</span>
            <span
              className={
                nodeResult.energized
                  ? 'text-green-400 font-medium'
                  : tc.textMuted
              }
            >
              {nodeResult.energized ? 'ENERGIZED' : 'DE-ENERGIZED'}
            </span>
            {selectedComp?.type === 'air_circuit_breaker' && (
              <>
                <span className={tc.textMuted}>ACB overload ∫:</span>
                <span>
                  {(selectedComp.acbSimState?.thermalExcess ?? 0).toFixed(1)} /{' '}
                  {selectedComp.properties.acbThermalTripIntegral ?? 80}
                </span>
                {(selectedComp.properties.acbBmsEnabled ?? false) &&
                  (() => {
                    const p = selectedComp.properties;
                    const trip = selectedComp.state === 'tripped';
                    const uvrOff = p.acbBmsUvrEnergized === false;
                    const aux52a =
                      !trip && selectedComp.state === 'on' && !uvrOff;
                    const aux52b =
                      selectedComp.state === 'off' || trip || uvrOff;
                    const proto = p.acbBmsProtocol ?? 'none';
                    return (
                      <>
                        <span className={tc.textMuted}>BMS 52a (closed):</span>
                        <span
                          className={
                            aux52a ? 'text-green-400 font-medium' : tc.textMuted
                          }
                        >
                          {aux52a ? 'HI' : 'LO'}
                        </span>
                        <span className={tc.textMuted}>BMS 52b (open):</span>
                        <span
                          className={
                            aux52b ? 'text-amber-400 font-medium' : tc.textMuted
                          }
                        >
                          {aux52b ? 'HI' : 'LO'}
                        </span>
                        <span className={tc.textMuted}>BMS TRIP:</span>
                        <span
                          className={
                            trip ? 'text-red-400 font-medium' : tc.textMuted
                          }
                        >
                          {trip ? 'HI' : 'LO'}
                        </span>
                        <span className={tc.textMuted}>BMS bus:</span>
                        <span className={tc.textMuted}>
                          {proto === 'none' ? '—' : proto.replace(/_/g, ' ')}
                        </span>
                      </>
                    );
                  })()}
              </>
            )}
            {(selectedComp?.type === 'motorized_mccb' ||
              selectedComp?.type === 'four_pole_motorized_mccb') &&
              (selectedComp.properties.mccbBmsEnabled ?? false) &&
              (() => {
                const p = selectedComp.properties;
                const trip = selectedComp.state === 'tripped';
                const interlockOpen =
                  p.mccbBmsCtrlVoltageOk === false ||
                  p.mccbBmsMotorReady === false;
                const closed =
                  selectedComp.state === 'on' && !trip && !interlockOpen;
                const auxNoHi = closed;
                const auxNcHi = !closed;
                const tripDiHi = trip;
                const proto = p.mccbBmsProtocol ?? 'none';
                return (
                  <>
                    <span className={tc.textMuted}>BMS AUX NO (closed):</span>
                    <span
                      className={
                        auxNoHi ? 'text-green-400 font-medium' : tc.textMuted
                      }
                    >
                      {auxNoHi ? 'HI' : 'LO'}
                    </span>
                    <span className={tc.textMuted}>BMS AUX NC:</span>
                    <span
                      className={
                        auxNcHi ? 'text-amber-400 font-medium' : tc.textMuted
                      }
                    >
                      {auxNcHi ? 'HI' : 'LO'}
                    </span>
                    <span className={tc.textMuted}>BMS TRIP:</span>
                    <span
                      className={
                        tripDiHi ? 'text-red-400 font-medium' : tc.textMuted
                      }
                    >
                      {tripDiHi ? 'HI' : 'LO'}
                    </span>
                    <span className={tc.textMuted}>BMS bus:</span>
                    <span className={tc.textMuted}>
                      {proto === 'none' ? '—' : proto.replace(/_/g, ' ')}
                    </span>
                  </>
                );
              })()}
          </div>
        </div>
      )}
    </div>
    </PropertyPanelProvider>
  );
};

export default PropertyPanel;
