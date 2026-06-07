import * as WireEditor from './propertyPanel/editors/WireEditor';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import type { ComponentProperties, PhaseSystem } from '../../types';
import { clampComponentScale } from '../../utils/geometry';
import {
  getComponentPanelDescription,
  WIRE_PANEL_DESCRIPTION,
} from '../../utils/componentPanelInfo';
import {
  DRAWING_LAYER_LABELS,
  resolveComponentDrawingLayer,
  resolveWireDrawingLayer,
} from '../../utils/drawingLayers';
import PropertySection from './propertyPanel/PropertySection';
import SelectionHeaderCard from './propertyPanel/SelectionHeaderCard';
import SimulationDetailsSection from './propertyPanel/SimulationDetailsSection';
import {
  BmsTypeSpecificProps,
  TypeSpecificProps,
} from './propertyPanel/TypeSpecificProps';
import {
  BMS_PANEL_TYPES,
  isBmsPanelType,
  showBmsPropertySection,
} from './propertyPanel/bmsTypes';
import { defaultPhaseSystemForType } from './propertyPanel/constants';
import {
  defaultFunctionLetter,
  isRenumberableComponent,
} from '../../utils/designatorRules';
import { Label } from './propertyPanel/PropertyPanelLabel';
import { DrawingLayerField } from './propertyPanel/DrawingLayerField';
import CrossSheetBacklinksSection from './CrossSheetBacklinksSection';
import type { DrawingLayerId } from '../../types';
import { parseCrossSheetReference } from '../../utils/crossSheetNavigation';
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
    navigateCrossSheetRef,
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

  const faultCount = useMemo(() => {
    if (!selectedId || !simulationResult) return 0;
    return simulationResult.faults.filter(
      (f) => f.affectedComponentId === selectedId
    ).length;
  }, [selectedId, simulationResult]);

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
      <div className={`flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden ${tc.text}`}>
        <div className={`border-b px-3 py-3 ${tc.border}`}>
          <h2 className={`es-typo-title-sm ${tc.textBright}`}>Properties</h2>
        </div>
        <div className="es-density-pad es-density-stack flex-1 overflow-y-auto">
          <CrossSheetBacklinksSection />
          <p className={`es-typo-body-sm ${tc.textMuted}`}>
            Select a component or wire
          </p>
        </div>
      </div>
    );
  }

  const componentPanelInfo = selectedComp
    ? getComponentPanelDescription(selectedComp.type)
    : null;

  const headerLabel = selectedComp
    ? selectedComp.label.trim() || componentPanelInfo?.displayName || 'Component'
    : selectedWire?.wireLabel?.trim() ||
      selectedWire?.wireNumber ||
      'Wire';
  const headerType = selectedComp
    ? (componentPanelInfo?.displayName ?? selectedComp.type.replace(/_/g, ' '))
    : WIRE_PANEL_DESCRIPTION.displayName;
  const headerLayer = selectedComp
    ? DRAWING_LAYER_LABELS[resolveComponentDrawingLayer(selectedComp)]
    : selectedWire
      ? DRAWING_LAYER_LABELS[resolveWireDrawingLayer(selectedWire)]
      : '—';

  return (
    <PropertyPanelProvider value={panelCtx}>
    <div
      className={`flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden ${tc.text}`}
    >
      <SelectionHeaderCard
        label={headerLabel}
        typeName={headerType}
        layerLabel={headerLayer}
        helpInfo={componentPanelInfo ?? (selectedWire ? WIRE_PANEL_DESCRIPTION : null)}
        status={{
          energized: selectedComp
            ? nodeResult?.energized
            : selectedWire?.energized,
          faultCount,
          tripped: selectedComp?.state === 'tripped',
        }}
      />

      <div className="es-density-pad flex-1 overflow-y-auto">
        <CrossSheetBacklinksSection />
        {selectedComp && (
          <>
            <PropertySection title="Documentation" defaultOpen>
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
            <DrawingLayerField
              component={selectedComp}
              tc={tc}
              onChange={(layer: DrawingLayerId) =>
                updateComponent(selectedComp.id, { drawingLayer: layer })
              }
            />
            <Label text="Cross-sheet reference">
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="=Sheet2!Q1"
                  value={selectedComp.properties.crossSheetRef ?? ''}
                  onChange={(e) =>
                    updateProp({ crossSheetRef: e.target.value })
                  }
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  className="rounded bg-blue-600 px-2 text-white hover:bg-blue-500 disabled:opacity-40 es-typo-caption"
                  disabled={
                    !parseCrossSheetReference(
                      selectedComp.properties.crossSheetRef ?? ''
                    )
                  }
                  onClick={() => {
                    const raw = selectedComp.properties.crossSheetRef?.trim();
                    if (raw) navigateCrossSheetRef(raw);
                  }}
                >
                  Go
                </button>
              </div>
              <p className={`mt-1 es-typo-caption ${tc.textMuted}`}>
                Use <code className="es-typo-caption">=SheetName!</code> or{' '}
                <code className="es-typo-caption">=Sheet2!Q1</code> to link across
                project sheets. Clickable on the canvas when the label matches.
              </p>
            </Label>
            {isRenumberableComponent(selectedComp) ? (
              <Label text="Function letter (IEC)">
                <input
                  type="text"
                  maxLength={4}
                  placeholder={defaultFunctionLetter(selectedComp.type)}
                  value={selectedComp.properties.designatorFunction ?? ''}
                  onChange={(e) =>
                    updateProp({
                      designatorFunction: e.target.value.toUpperCase(),
                    })
                  }
                  className="input-field"
                />
              </Label>
            ) : null}
            </PropertySection>

            <PropertySection title="Electrical" defaultOpen>
            <Label text="Phase system">
              <select
                value={
                  (selectedComp.properties.phaseSystem ??
                    defaultPhaseSystemForType(selectedComp.type))
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
            <p className={`leading-snug es-typo-caption ${tc.textMuted}`}>
              Supply / MCB / contactor: switching phase may replace the symbol
              and remap L1/N (extra phase wires removed). Motors: with
              three-phase set, line current uses P/(√3·U<sub>L-L</sub>·PF); a
              1φ motor symbol uses ×1.25. A 3φ motor set to single-phase uses
              P/(U<sub>L-N</sub>·PF)·1.25.
            </p>
            <TypeSpecificProps excludeTypes={BMS_PANEL_TYPES} />
            <SimulationDetailsSection />
            </PropertySection>

            <PropertySection title="Mechanical">
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
                <span
                  className={`w-11 shrink-0 font-mono es-typo-body-sm es-tabular-nums ${tc.textMuted}`}
                >
                  {(selectedComp.scale ?? 1).toFixed(2)}×
                </span>
              </div>
            </Label>
            <div className="flex gap-1 pt-2">
              <button
                onClick={() => rotateComponent(selectedComp.id)}
                className={`flex-1 rounded px-2 py-1.5 es-typo-body ${tc.btnBg} ${tc.btnText} ${tc.btnHover}`}
              >
                Rotate
              </button>
              <button
                onClick={() => duplicateComponent(selectedComp.id)}
                className={`flex-1 rounded px-2 py-1.5 es-typo-body ${tc.btnBg} ${tc.btnText} ${tc.btnHover}`}
              >
                Duplicate
              </button>
              <button
                onClick={() => removeComponent(selectedComp.id)}
                className="flex-1 rounded bg-red-700 px-2 py-1.5 text-white hover:bg-red-600 es-typo-body"
              >
                Delete
              </button>
            </div>
            </PropertySection>

            {showBmsPropertySection(selectedComp.type) ? (
              <PropertySection title="BMS">
                <BmsTypeSpecificProps />
                {!isBmsPanelType(selectedComp.type) ? (
                  <p className={`es-typo-caption leading-snug ${tc.textMuted}`}>
                    Motor, shunt, and auxiliary BMS settings for this breaker are
                    under Electrical with the device ratings.
                  </p>
                ) : null}
              </PropertySection>
            ) : null}
          </>
        )}

        {selectedWire && <WireEditor.WirePropsContent />}
      </div>
    </div>
    </PropertyPanelProvider>
  );
};

export default PropertyPanel;
