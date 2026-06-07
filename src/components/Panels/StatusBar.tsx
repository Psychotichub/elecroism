import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useUiStore } from '../../store/uiStore';
import { runCadCommand } from '../../utils/cadCommands';
import { analyzeConnectionIntegrity } from '../../utils/connectionIntegrity';
import { getSimulationRuntimeMode } from '../../simulation/simulationClient';
import { isElectronApp } from '../../utils/pwaEnvironment';
import { isAnySheetDirty } from '../../utils/sheetDirtyState';

const WIRE_MODE_KEYS: {
  key: 'connection' | 'endpoint' | 'midpoint' | 'intersection';
  letter: string;
}[] = [
  { key: 'connection', letter: 'C' },
  { key: 'endpoint', letter: 'E' },
  { key: 'midpoint', letter: 'M' },
  { key: 'intersection', letter: 'X' },
];

const StatusBar: React.FC = () => {
  const project = useCircuitStore((s) => s.project);
  const circuit = useCircuitStore((s) => s.circuit);
  const sheetSaveBaselines = useCircuitStore((s) => s.sheetSaveBaselines);
  const {
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

  const simulationOnMainThread =
    !isElectronApp() && getSimulationRuntimeMode() === 'main-thread';

  const projectDirty = isAnySheetDirty(project, circuit, sheetSaveBaselines);

  const totalPower = simulationResult?.totalPowerW || 0;
  const totalCurrent = simulationResult?.totalCurrentA || 0;
  const faultCount = simulationResult?.faults.length || 0;
  const compCount = circuit.components.length;
  const wireCount = circuit.wires.length;
  const wireVertexCount = wirePoints.length / 2;

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
    <div className="es-status-bar" data-testid="status-bar">
      <div className="es-status-zone-left" data-testid="status-zone-left">
        <span
          className="max-w-[9rem] shrink-0 truncate font-medium text-es-primary"
          title={project.name}
        >
          {projectDirty ? (
            <span className="text-es-warning" aria-hidden>
              •{' '}
            </span>
          ) : null}
          {project.name}
        </span>
        <span className="shrink-0">
          Tool:{' '}
          <span className="capitalize text-es-primary">{tool}</span>
        </span>
        <div
          className="es-status-wire-modes hidden min-[900px]:flex"
          title="Wire drafting: F3 Osnap · F8 Ortho · F9 Grid · Tab leg · Enter finish on hover · Backspace undo last vertex · Shift temp ortho · Ctrl no snap"
        >
          <span className="shrink-0 text-es-secondary">Wire</span>
          <span
            className={
              wireObjectSnapEnabled
                ? 'font-semibold text-amber-400'
                : 'opacity-40'
            }
          >
            {wireObjectSnapEnabled ? 'OSNAP' : 'osnap'}
          </span>
          {wireObjectSnapEnabled ? (
            <span className="flex gap-0.5" aria-label="Object snap modes">
              {WIRE_MODE_KEYS.map(({ key, letter }) => (
                <span
                  key={key}
                  className={
                    wireSnapModes[key]
                      ? 'font-bold text-es-primary'
                      : 'opacity-30'
                  }
                >
                  {letter}
                </span>
              ))}
            </span>
          ) : null}
          <span className="shrink-0 text-es-secondary opacity-50">|</span>
          <span
            className={
              wireOrthoEnabled
                ? 'font-semibold text-emerald-400'
                : 'opacity-40'
            }
          >
            {wireOrthoEnabled ? 'ORTHO' : 'ortho'}
          </span>
          <span className="shrink-0 text-es-secondary opacity-50">|</span>
          <span
            className={
              wireGridSnapEnabled
                ? 'font-semibold text-sky-400'
                : 'opacity-40'
            }
          >
            {wireGridSnapEnabled ? 'GRID' : 'grid'}
          </span>
          <span className="shrink-0 text-es-secondary opacity-50">|</span>
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
              <span className="shrink-0 text-es-secondary opacity-50">|</span>
              {busDropActive ? (
                <span className="font-semibold text-emerald-400">
                  Bus drop — click canvas to place feeder
                </span>
              ) : (
                <span className="text-es-secondary">
                  {wireVertexCount} pt{wireVertexCount !== 1 ? 's' : ''}
                </span>
              )}
            </>
          ) : null}
        </div>
        <div className="es-status-cmd flex min-w-0 flex-1 items-center gap-1">
          <span className="shrink-0 es-typo-label text-es-secondary">Cmd</span>
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
            className="h-5 min-w-0 flex-1 max-w-[14rem] rounded border border-es-borderSubtle bg-es-canvas px-2 text-es-primary outline-none es-typo-body-sm es-focus-ring"
            aria-label="CAD command"
          />
          <span className="max-w-[8rem] truncate text-emerald-400 es-typo-body-sm">
            {commandResult}
          </span>
        </div>
      </div>

      <div className="es-status-zone-center" data-testid="status-zone-center">
        {simulationPending ? (
          <span className="animate-pulse text-sky-400 es-typo-body-sm">
            Simulating…
          </span>
        ) : null}
        <span>
          Power{' '}
          <span className="text-yellow-400 es-tabular-nums">
            {totalPower.toFixed(1)}W
          </span>
        </span>
        <span>
          Current{' '}
          <span className="text-blue-400 es-tabular-nums">
            {totalCurrent.toFixed(2)}A
          </span>
        </span>
        <span className="hidden sm:inline">
          Comp{' '}
          <span className="text-es-primary es-tabular-nums">{compCount}</span>
        </span>
        <span className="hidden sm:inline">
          Wires{' '}
          <span className="text-es-primary es-tabular-nums">{wireCount}</span>
        </span>
        <span className="hidden md:inline">
          Zoom{' '}
          <span className="text-es-primary es-tabular-nums">
            {(circuit.zoom * 100).toFixed(0)}%
          </span>
        </span>
      </div>

      <div className="es-status-zone-right" data-testid="status-zone-right">
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {canvasStatusMessage}
        </span>
        {faultCount > 0 ? (
          <span className="animate-pulse font-medium text-red-400 es-tabular-nums">
            ⚠ {faultCount} Fault{faultCount > 1 ? 's' : ''}
          </span>
        ) : null}
        {connectionIntegrityOverlay ? (
          <span
            className={
              integrity.unwiredTerminalCount + integrity.floatingWireEndCount > 0
                ? 'text-red-400'
                : 'text-es-secondary'
            }
            title="Connection integrity (toggle in toolbar)"
          >
            Open:{' '}
            <span className="text-es-primary es-tabular-nums">
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
        {simulationOnMainThread ? (
          <span
            className="max-w-[10rem] truncate text-amber-400 es-typo-body-sm"
            title="Simulation worker unavailable — running on the main thread. Large circuits may feel sluggish."
          >
            Sim: main thread
          </span>
        ) : null}
        <span
          className="es-status-brand hidden min-[1200px]:inline-flex"
          aria-hidden
        >
          <span className="text-es-accent" aria-hidden>
            ⚡
          </span>
          ElectroSim
        </span>
      </div>
    </div>
  );
};

export default StatusBar;
