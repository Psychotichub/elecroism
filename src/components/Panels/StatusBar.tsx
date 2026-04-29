import React, { useEffect, useRef, useState } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { runCadCommand } from '../../utils/cadCommands';

const StatusBar: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const {
    circuit,
    simulationResult,
    tool,
    selectedId,
    setTool,
    addComponent,
    setSelected,
    setZoom,
    setPan,
    duplicateComponent,
  } = useCircuitStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [command, setCommand] = useState('');
  const [commandResult, setCommandResult] = useState('');

  const totalPower = simulationResult?.totalPowerW || 0;
  const totalCurrent = simulationResult?.totalCurrentA || 0;
  const faultCount = simulationResult?.faults.length || 0;
  const compCount = circuit.components.length;
  const wireCount = circuit.wires.length;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === ':' || e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        setCommand('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const runCommand = () => {
    const raw = command.trim();
    if (!raw) return;
    setCommandResult(
      runCadCommand({
        raw,
        circuit,
        selectedId,
        setTool,
        addComponent,
        setSelected,
        setZoom,
        setPan,
        duplicateComponent,
      })
    );
  };

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
      <div className="ml-2 flex items-center gap-1 min-w-[320px]">
        <span className={tc.textMuted}>Cmd</span>
        <input
          ref={inputRef}
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              runCommand();
              setCommand('');
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              setCommand('');
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder=": s | w | add mcb | z e | c"
          className={`h-5 px-2 rounded border ${tc.border} ${tc.canvas} ${tc.text} text-[11px] w-64 outline-none`}
        />
        <span className="text-[11px] text-emerald-400 truncate max-w-48">
          {commandResult}
        </span>
      </div>
    </div>
  );
};

export default StatusBar;
