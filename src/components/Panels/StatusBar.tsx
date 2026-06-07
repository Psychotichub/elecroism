import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { useUiStore } from '../../store/uiStore';
import { runCadCommand } from '../../utils/cadCommands';
import { analyzeConnectionIntegrity } from '../../utils/connectionIntegrity';

const StatusBar: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const {
    circuit,
    simulationResult,
    simulationPending,
    tool,
    selectedId,
    wireInProgress,
    wirePoints,
    wireObjectSnapEnabled,
    wireSnapModes,
    wireOrthoEnabled,
    wireGridSnapEnabled,
    wireAutoRouteEnabled,
    setTool,
    addComponent,
    setSelected,
    setZoom,
    setPan,
    duplicateComponent,
    isBusDropWireActive,
  } = useCircuitStore();
  const busDropActive =
    tool === 'wire' && !!wireInProgress && isBusDropWireActive();
  const inputRef = useRef<HTMLInputElement>(null);
  const [command, setCommand] = useState('');
  const [commandResult, setCommandResult] = useState('');

  const connectionIntegrityOverlay = useUiStore(
    (s) => s.connectionIntegrityOverlay
  );
  const canvasStatusMessage = useUiStore((s) => s.canvasStatusMessage);

  const integrity = useMemo(
    () => analyzeConnectionIntegrity(circuit),
    [circuit]
  );

  const totalPower = simulationResult?.totalPowerW || 0;
  const totalCurrent = simulationResult?.totalCurrentA || 0;
  const faultCount = simulationResult?.faults.length || 0;
  const compCount = circuit.components.length;
  const wireCount = circuit.wires.length;
  const wireVertexCount = wirePoints.length / 2;
  const modeKeys: { key: keyof typeof wireSnapModes; letter: string }[] = [
    { key: 'connection', letter: 'C' },
    { key: 'endpoint', letter: 'E' },
    { key: 'midpoint', letter: 'M' },
    { key: 'intersection', letter: 'X' },
  ];

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
      <div
        className={`hidden min-[900px]:flex items-center gap-x-2 gap-y-0.5 border-l pl-3 ${tc.border} font-mono text-[10px] leading-tight`}
        title="Wire drafting: F3 Osnap · F8 Ortho · F9 Grid · Tab leg · Enter finish on hover · Backspace undo last vertex · Shift temp ortho · Ctrl no snap"
      >
        <span className={`shrink-0 ${tc.textMuted}`}>Wire</span>
        <span
          className={
            wireObjectSnapEnabled ? 'font-semibold text-amber-400' : 'opacity-40'
          }
        >
          {wireObjectSnapEnabled ? 'OSNAP' : 'osnap'}
        </span>
        {wireObjectSnapEnabled ? (
          <span className="flex gap-0.5" aria-label="Object snap modes">
            {modeKeys.map(({ key, letter }) => (
              <span
                key={key}
                className={
                  wireSnapModes[key] ? `font-bold ${tc.text}` : 'opacity-30'
                }
              >
                {letter}
              </span>
            ))}
          </span>
        ) : null}
        <span className={`shrink-0 ${tc.textMuted} opacity-50`}>|</span>
        <span
          className={
            wireOrthoEnabled ? 'font-semibold text-emerald-400' : 'opacity-40'
          }
        >
          {wireOrthoEnabled ? 'ORTHO' : 'ortho'}
        </span>
        <span className={`shrink-0 ${tc.textMuted} opacity-50`}>|</span>
        <span
          className={
            wireGridSnapEnabled ? 'font-semibold text-sky-400' : 'opacity-40'
          }
        >
          {wireGridSnapEnabled ? 'GRID' : 'grid'}
        </span>
        <span className={`shrink-0 ${tc.textMuted} opacity-50`}>|</span>
        <span
          className={
            wireAutoRouteEnabled
              ? 'font-semibold text-violet-400'
              : 'opacity-40'
          }
        >
          {wireAutoRouteEnabled ? 'AUTO' : 'auto'}
        </span>
        {tool === 'wire' && wireInProgress ? (
          <>
            <span className={`shrink-0 ${tc.textMuted} opacity-50`}>|</span>
            {busDropActive ? (
              <span className="font-semibold text-emerald-400">
                Bus drop — click canvas to place feeder
              </span>
            ) : (
              <span className={tc.textMuted}>
                {wireVertexCount} pt{wireVertexCount !== 1 ? 's' : ''}
              </span>
            )}
          </>
        ) : null}
      </div>
      <span>
        Components: <span className={tc.text}>{compCount}</span>
      </span>
      <span>
        Wires: <span className={tc.text}>{wireCount}</span>
      </span>
      {connectionIntegrityOverlay ? (
        <span
          className={
            integrity.unwiredTerminalCount + integrity.floatingWireEndCount > 0
              ? 'text-red-400'
              : tc.textMuted
          }
          title="Connection integrity (toggle in toolbar)"
        >
          Open:{' '}
          <span className={tc.text}>
            {integrity.unwiredTerminalCount} term
            {integrity.floatingWireEndCount > 0
              ? ` · ${integrity.floatingWireEndCount} float`
              : ''}
            {integrity.junctionCount > 0
              ? ` · ${integrity.junctionCount} jct`
              : ''}
          </span>
        </span>
      ) : null}
      <span>
        Zoom: <span className={tc.text}>{(circuit.zoom * 100).toFixed(0)}%</span>
      </span>
      <div className="flex-1" />
      <span
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {canvasStatusMessage}
      </span>
      {simulationPending ? (
        <span className="text-sky-400 animate-pulse">Simulating…</span>
      ) : null}
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
