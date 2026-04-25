import React from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';

const StatusBar: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const { circuit, simulationResult, tool } = useCircuitStore();

  const totalPower = simulationResult?.totalPowerW || 0;
  const totalCurrent = simulationResult?.totalCurrentA || 0;
  const faultCount = simulationResult?.faults.length || 0;
  const compCount = circuit.components.length;
  const wireCount = circuit.wires.length;

  return (
    <div className={`h-7 ${tc.toolbar} ${tc.textMuted} flex items-center px-3 text-xs gap-6 border-t ${tc.border} select-none`}>
      <span>
        Tool: <span className={tc.text + ' capitalize'}>{tool}</span>
      </span>
      <span>
        Components: <span className={tc.text}>{compCount}</span>
      </span>
      <span>
        Wires: <span className={tc.text}>{wireCount}</span>
      </span>
      <span>
        Zoom: <span className={tc.text}>{(circuit.zoom * 100).toFixed(0)}%</span>
      </span>
      <div className="flex-1" />
      <span>
        Total Power:{' '}
        <span className="text-yellow-400">{totalPower.toFixed(1)}W</span>
      </span>
      <span>
        Total Current:{' '}
        <span className="text-blue-400">{totalCurrent.toFixed(2)}A</span>
      </span>
      {faultCount > 0 && (
        <span className="text-red-400 font-medium animate-pulse">
          ⚠ {faultCount} Fault{faultCount > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
};

export default StatusBar;
