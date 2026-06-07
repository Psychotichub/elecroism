import React, { useMemo } from 'react';
import { useCircuitStore } from '../../../store/circuitStore';
import { useUiStore } from '../../../store/uiStore';
import { usePPCtx } from './PropertyPanelContext';
import { defaultPhaseSystemForType } from './constants';
import { explainWhyDeenergized } from '../../../utils/whyIsOff';

const SimulationDetailsSection: React.FC = () => {
  const { selectedComp, nodeResult, circuit } = usePPCtx();
  const simulationResult = useCircuitStore((s) => s.simulationResult);
  const activeChallengeId = useUiStore((s) => s.activeChallengeId);
  const challengeSubmitted = useUiStore((s) => s.challengeSubmitted);
  const hideWhyOffHint = Boolean(activeChallengeId && !challengeSubmitted);

  const whyOffMessage = useMemo(() => {
    if (!selectedComp) return null;
    return explainWhyDeenergized(circuit, selectedComp.id, simulationResult);
  }, [circuit, selectedComp, simulationResult]);

  if (!nodeResult) return null;

  return (
    <div className="space-y-1 rounded-es-md border border-es-borderSubtle bg-es-chrome2/40 p-2">
      <h4 className="es-typo-label text-es-secondary">Simulation</h4>
      <div className="grid grid-cols-2 gap-1 es-typo-body-sm es-tabular-nums">
        {selectedComp && (
          <>
            <span className="text-es-secondary">Phase (set):</span>
            <span>
              {(selectedComp.properties.phaseSystem ??
                defaultPhaseSystemForType(selectedComp.type)) === 'three_phase'
                ? 'Three-phase'
                : 'Single-phase'}
            </span>
          </>
        )}
        <span className="text-es-secondary">Voltage:</span>
        <span>{nodeResult.voltageV.toFixed(1)}V</span>
        <span className="text-es-secondary">Current:</span>
        <span>{nodeResult.currentA.toFixed(2)}A</span>
        <span className="text-es-secondary">Power:</span>
        <span>{nodeResult.powerW.toFixed(1)}W</span>
        {nodeResult.powerFactor !== undefined && (
          <>
            <span className="text-es-secondary">PF:</span>
            <span>{nodeResult.powerFactor.toFixed(2)}</span>
          </>
        )}
        {nodeResult.lineVoltageRmsV !== undefined && (
          <>
            <span className="text-es-secondary">U_L-L:</span>
            <span>{nodeResult.lineVoltageRmsV.toFixed(1)}V</span>
          </>
        )}
        {nodeResult.phaseVoltageRmsV !== undefined && (
          <>
            <span className="text-es-secondary">U_L-N:</span>
            <span>{nodeResult.phaseVoltageRmsV.toFixed(1)}V</span>
          </>
        )}
        {nodeResult.lineCurrentRmsA !== undefined && (
          <>
            <span className="text-es-secondary">I_line:</span>
            <span>{nodeResult.lineCurrentRmsA.toFixed(2)}A</span>
          </>
        )}
        {nodeResult.voltageL1NV !== undefined && (
          <div className="col-span-2 mt-2 border-t border-es-borderSubtle pt-2">
            <p className="mb-1.5 es-typo-label uppercase text-es-secondary">
              Three-phase results
            </p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 es-tabular-nums">
              <span className="text-es-secondary">I_L1:</span>
              <span>{(nodeResult.currentL1A ?? 0).toFixed(2)} A</span>
              <span className="text-es-secondary">I_L2:</span>
              <span>{(nodeResult.currentL2A ?? 0).toFixed(2)} A</span>
              <span className="text-es-secondary">I_L3:</span>
              <span>{(nodeResult.currentL3A ?? 0).toFixed(2)} A</span>
              <span className="text-es-secondary">I_N:</span>
              <span>{(nodeResult.currentNeutralA ?? 0).toFixed(2)} A</span>
              <span className="text-es-secondary">U_L1-N:</span>
              <span>{(nodeResult.voltageL1NV ?? 0).toFixed(1)} V</span>
              <span className="text-es-secondary">U_L2-N:</span>
              <span>{(nodeResult.voltageL2NV ?? 0).toFixed(1)} V</span>
              <span className="text-es-secondary">U_L3-N:</span>
              <span>{(nodeResult.voltageL3NV ?? 0).toFixed(1)} V</span>
              <span className="text-es-secondary">U_L1-L2:</span>
              <span>{(nodeResult.voltageL1L2V ?? 0).toFixed(1)} V</span>
              <span className="text-es-secondary">U_L2-L3:</span>
              <span>{(nodeResult.voltageL2L3V ?? 0).toFixed(1)} V</span>
              <span className="text-es-secondary">U_L3-L1:</span>
              <span>{(nodeResult.voltageL3L1V ?? 0).toFixed(1)} V</span>
            </div>
          </div>
        )}
        {!nodeResult.energized && whyOffMessage && !hideWhyOffHint ? (
          <div className="col-span-2 mt-1 rounded border border-amber-600/40 bg-amber-950/40 px-2 py-1.5 leading-snug text-amber-200 es-typo-body-sm">
            <span className="font-semibold text-amber-400">Why off? </span>
            {whyOffMessage}
          </div>
        ) : null}
        {selectedComp?.type === 'air_circuit_breaker' && (
          <>
            <span className="text-es-secondary">ACB overload ∫:</span>
            <span>
              {(selectedComp.acbSimState?.thermalExcess ?? 0).toFixed(1)} /{' '}
              {selectedComp.properties.acbThermalTripIntegral ?? 80}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default SimulationDetailsSection;
