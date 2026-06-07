import React from 'react';
import { usePPCtx } from '../PropertyPanelContext';
import { useCircuitStore } from '../../../../store/circuitStore';

const PqaLiveReadings: React.FC = () => {
  const { selectedComp, tc } = usePPCtx();
  const simulationResult = useCircuitStore((s) => s.simulationResult);
  const node = selectedComp ? simulationResult?.nodes[selectedComp.id] : null;

  if (!node?.energized) {
    return (
      <p className={`es-typo-caption ${tc.textMuted}`}>
        Run simulation with the analyzer on a live 3φ + N feeder to read THD and
        neutral harmonic estimates.
      </p>
    );
  }

  return (
    <div className={`rounded border px-2 py-1.5 es-typo-caption ${tc.border}`}>
      <div className={`font-semibold ${tc.textBright}`}>Last simulation</div>
      <div className="mt-1 es-tabular-nums">
        Max THD:{' '}
        {(node.thdPercent ?? simulationResult?.powerQualityMaxThdPct ?? 0).toFixed(0)}%
      </div>
      <div className="es-tabular-nums">
        Σ I_N (triplen est.):{' '}
        {(
          node.currentNeutralA ??
          simulationResult?.powerQualityNeutralHarmonicA ??
          0
        ).toFixed(2)}{' '}
        A
      </div>
    </div>
  );
};

export default PqaLiveReadings;
