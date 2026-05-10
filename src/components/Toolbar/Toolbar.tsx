import React, { useEffect, useCallback } from 'react';
import {
  FiFile,
  FiFolderPlus,
  FiSave,
  FiImage,
  FiMousePointer,
  FiEdit3,
  FiTrash2,
  FiMove,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiZoomIn,
  FiZoomOut,
  FiMaximize,
  FiPlay,
  FiRotateCw,
  FiSun,
  FiMoon,
  FiTag,
  FiList,
} from 'react-icons/fi';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import type { ToolMode } from '../../types';
import ExamplesDropdown from './ExamplesDropdown';

interface ToolbarToolBtnProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  shortcut?: string;
  /** Classes when not active (e.g. theme text + hover) */
  inactiveClassName: string;
}

const ToolbarToolBtn: React.FC<ToolbarToolBtnProps> = ({
  icon,
  label,
  onClick,
  active,
  shortcut,
  inactiveClassName,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition-colors ${
      active ? 'bg-blue-600 text-white' : inactiveClassName
    }`}
    title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
  >
    {icon}
    <span className="hidden lg:inline">{label}</span>
  </button>
);

const ToolbarDivider: React.FC<{ className: string }> = ({ className }) => (
  <div className={className} />
);

const Toolbar: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const tc = themeColors[theme];

  const {
    tool,
    setTool,
    clearCircuit,
    saveCircuit,
    loadCircuit,
    undo,
    redo,
    setZoom,
    setPan,
    circuit,
    runSimulation,
    wireObjectSnapEnabled,
    wireGridSnapEnabled,
    wireOrthoEnabled,
    wireSnapModes,
    setWireObjectSnapEnabled,
    setWireSnapModes,
    toggleWireObjectSnap,
    toggleWireGridSnap,
    toggleWireOrtho,
    toggleWireSnapMode,
    wireAutoRouteEnabled,
    toggleWireAutoRoute,
    setCircuitWireLabelsVisible,
    exportWireScheduleCsv,
  } = useCircuitStore();

  const handleOpen = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.esim,.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.circuit) {
            loadCircuit({
              ...circuit,
              components: data.circuit.components || [],
              wires: data.circuit.wires || [],
              name: data.name || 'Loaded Circuit',
              phaseImbalanceWarningPercent:
                data.circuit.phaseImbalanceWarningPercent ?? 15,
              continuityPowerThresholdW:
                data.circuit.continuityPowerThresholdW ?? 0.5,
            });
          }
        } catch {
          alert('Invalid file format');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [loadCircuit, circuit]);

  const handleExportPNG = useCallback(() => {
    const stage = document.querySelector('.konvajs-content canvas') as HTMLCanvasElement;
    if (!stage) return;
    const link = document.createElement('a');
    link.download = `${circuit.name}.png`;
    link.href = stage.toDataURL('image/png');
    link.click();
  }, [circuit.name]);

  const handleExportWireSchedule = useCallback(() => {
    exportWireScheduleCsv();
  }, [exportWireScheduleCsv]);

  const handleFitToScreen = useCallback(() => {
    setZoom(1);
    setPan(100, 50);
  }, [setZoom, setPan]);

  // AutoCAD-style keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (ctrl && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (ctrl && e.key === 's') {
        e.preventDefault();
        saveCircuit();
      } else if (ctrl && e.key === 'o') {
        e.preventDefault();
        handleOpen();
      } else if (ctrl && e.key === 'n') {
        e.preventDefault();
        clearCircuit();
      } else if (ctrl && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const { circuit: liveCircuit } = useCircuitStore.getState();
        useCircuitStore.setState({
          selectedId: null,
          circuit: {
            ...liveCircuit,
            components: liveCircuit.components.map((c) => ({
              ...c,
              selected: true,
            })),
          },
        });
      } else {
        // AutoCAD-style single key shortcuts
        const keyMap: Record<string, ToolMode> = {
          v: 'select',
          w: 'wire',
          e: 'delete',
          ' ': 'pan',
        };
        const mappedTool = keyMap[e.key.toLowerCase()];
        if (mappedTool) {
          e.preventDefault();
          setTool(mappedTool);
        }

        // Additional shortcuts
        if (e.key === '+' || e.key === '=') {
          setZoom(circuit.zoom * 1.2);
        } else if (e.key === '-') {
          setZoom(circuit.zoom / 1.2);
        } else if (e.key === 'f' || e.key === 'F') {
          handleFitToScreen();
        } else if (e.key === 'F3') {
          e.preventDefault();
          useCircuitStore.getState().toggleWireObjectSnap();
        } else if (e.key === 'F8') {
          e.preventDefault();
          useCircuitStore.getState().toggleWireOrtho();
        } else if (e.key === 'F9') {
          e.preventDefault();
          useCircuitStore.getState().toggleWireGridSnap();
        } else if (e.key === 'Tab') {
          const { tool, wireInProgress } = useCircuitStore.getState();
          if (tool === 'wire' && wireInProgress) {
            e.preventDefault();
            useCircuitStore.getState().toggleWireOrientation();
          }
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          const {
            selectedId,
            removeComponent,
            removeWire,
            removeWireVertex,
            wireGripVertexIndex,
            circuit: liveCircuit,
            wireInProgress: wipWire,
          } = useCircuitStore.getState();
          if (e.key === 'Backspace' && wipWire) {
            return;
          }
          const selectedComponentIds = liveCircuit.components
            .filter((c) => c.selected)
            .map((c) => c.id);
          if (selectedComponentIds.length > 0) {
            selectedComponentIds.forEach((id) => removeComponent(id));
          } else if (selectedId) {
            const selWire = liveCircuit.wires.find((w) => w.id === selectedId);
            const nVerts = selWire ? selWire.points.length / 2 : 0;
            const canRemoveInteriorGrip =
              selWire &&
              wireGripVertexIndex != null &&
              wireGripVertexIndex > 0 &&
              wireGripVertexIndex < nVerts - 1;
            if (selWire && canRemoveInteriorGrip) {
              removeWireVertex(selectedId, wireGripVertexIndex);
            } else if (selWire) {
              removeWire(selectedId);
            } else {
              removeComponent(selectedId);
            }
          }
        } else if (e.key === 'r' || e.key === 'R') {
          const { selectedId, rotateComponent } =
            useCircuitStore.getState();
          if (selectedId) {
            rotateComponent(selectedId);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo,
    redo,
    saveCircuit,
    handleOpen,
    clearCircuit,
    setTool,
    setZoom,
    circuit.zoom,
    circuit.wires,
    handleFitToScreen,
  ]);

  const toolBtnInactive = `${tc.btnText} ${tc.itemHover}`;
  const dividerClass = `w-px h-5 mx-1 ${
    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
  }`;

  return (
    <div className={`h-10 ${tc.toolbar} flex items-center px-2 gap-0.5 border-b ${tc.border} select-none shadow-sm`}>
      <ToolbarToolBtn
        icon={<FiFile />}
        label="New"
        onClick={clearCircuit}
        shortcut="Ctrl+N"
        inactiveClassName={toolBtnInactive}
      />
      <ToolbarToolBtn
        icon={<FiFolderPlus />}
        label="Open"
        onClick={handleOpen}
        shortcut="Ctrl+O"
        inactiveClassName={toolBtnInactive}
      />
      <ExamplesDropdown inactiveClassName={toolBtnInactive} />
      <ToolbarToolBtn
        icon={<FiSave />}
        label="Save"
        onClick={saveCircuit}
        shortcut="Ctrl+S"
        inactiveClassName={toolBtnInactive}
      />
      <ToolbarToolBtn
        icon={<FiImage />}
        label="Export"
        onClick={handleExportPNG}
        inactiveClassName={toolBtnInactive}
      />
      <ToolbarToolBtn
        icon={<FiList />}
        label="Wires CSV"
        onClick={handleExportWireSchedule}
        inactiveClassName={toolBtnInactive}
      />

      <ToolbarDivider className={dividerClass} />

      <ToolbarToolBtn
        icon={<FiMousePointer />}
        label="Select"
        onClick={() => setTool('select')}
        active={tool === 'select'}
        shortcut="V"
        inactiveClassName={toolBtnInactive}
      />
      <ToolbarToolBtn
        icon={<FiEdit3 />}
        label="Wire"
        onClick={() => setTool('wire')}
        active={tool === 'wire'}
        shortcut="W"
        inactiveClassName={toolBtnInactive}
      />
      <button
        type="button"
        onClick={() => toggleWireObjectSnap()}
        title="Object snap master (F3). Cmd: osnap | osnap all | osnap none. Enter finishes on hover; Tab flips leg; Backspace removes last wire point."
        className={`rounded px-1.5 py-1 text-[10px] font-semibold ${
          wireObjectSnapEnabled
            ? 'bg-amber-600/90 text-white'
            : `${toolBtnInactive} opacity-70`
        }`}
      >
        Osnap
      </button>
      <div
        className={`flex items-center gap-px rounded border px-0.5 py-0.5 ${
          theme === 'dark' ? 'border-zinc-600' : 'border-zinc-300'
        }`}
        title="Snap targets: C connection, E endpoint, M midpoint, X intersection"
      >
        {(
          [
            ['connection', 'C', 'Connection / terminals'] as const,
            ['endpoint', 'E', 'Wire endpoints'] as const,
            ['midpoint', 'M', 'Wire segment midpoints'] as const,
            ['intersection', 'X', 'Wire crossings'] as const,
          ] as const
        ).map(([key, letter, t]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (!wireObjectSnapEnabled) {
                setWireObjectSnapEnabled(true);
                setWireSnapModes({ [key]: true });
                return;
              }
              toggleWireSnapMode(key);
            }}
            title={t}
            className={`min-w-[1.1rem] rounded px-0.5 py-0.5 text-[9px] font-bold ${
              wireObjectSnapEnabled && wireSnapModes[key]
                ? 'bg-amber-500/85 text-white'
                : `${toolBtnInactive} opacity-50`
            }`}
          >
            {letter}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => toggleWireOrtho()}
        title="Ortho — horizontal/vertical segments only (F8). Hold Shift for temporary ortho when off."
        className={`rounded px-1.5 py-1 text-[10px] font-semibold ${
          wireOrthoEnabled
            ? 'bg-emerald-600/90 text-white'
            : `${toolBtnInactive} opacity-70`
        }`}
      >
        Ortho
      </button>
      <button
        type="button"
        onClick={() => toggleWireGridSnap()}
        title="Snap wire to grid (F9)"
        className={`rounded px-1.5 py-1 text-[10px] font-semibold ${
          wireGridSnapEnabled
            ? 'bg-sky-600/90 text-white'
            : `${toolBtnInactive} opacity-70`
        }`}
      >
        Grid
      </button>
      <button
        type="button"
        onClick={() => toggleWireAutoRoute()}
        title="Auto-route: terminal-to-terminal with no clicks uses a Manhattan path (avoids symbols when possible). Cmd: autoroute"
        className={`rounded px-1.5 py-1 text-[10px] font-semibold ${
          wireAutoRouteEnabled
            ? 'bg-violet-600/90 text-white'
            : `${toolBtnInactive} opacity-70`
        }`}
      >
        Auto
      </button>
      <ToolbarToolBtn
        icon={<FiTrash2 />}
        label="Delete"
        onClick={() => setTool('delete')}
        active={tool === 'delete'}
        shortcut="E"
        inactiveClassName={toolBtnInactive}
      />
      <ToolbarToolBtn
        icon={<FiMove />}
        label="Pan"
        onClick={() => setTool('pan')}
        active={tool === 'pan'}
        shortcut="Space"
        inactiveClassName={toolBtnInactive}
      />
      <ToolbarToolBtn
        icon={<FiRotateCw />}
        label="Rotate"
        onClick={() => {
          const { selectedId, rotateComponent } =
            useCircuitStore.getState();
          if (selectedId) rotateComponent(selectedId);
        }}
        shortcut="R"
        inactiveClassName={toolBtnInactive}
      />

      <ToolbarDivider className={dividerClass} />

      <ToolbarToolBtn
        icon={<FiCornerUpLeft />}
        label="Undo"
        onClick={undo}
        shortcut="Ctrl+Z"
        inactiveClassName={toolBtnInactive}
      />
      <ToolbarToolBtn
        icon={<FiCornerUpRight />}
        label="Redo"
        onClick={redo}
        shortcut="Ctrl+Y"
        inactiveClassName={toolBtnInactive}
      />

      <ToolbarDivider className={dividerClass} />

      <ToolbarToolBtn
        icon={<FiZoomIn />}
        label=""
        onClick={() => setZoom(circuit.zoom * 1.2)}
        shortcut="+"
        inactiveClassName={toolBtnInactive}
      />
      <ToolbarToolBtn
        icon={<FiZoomOut />}
        label=""
        onClick={() => setZoom(circuit.zoom / 1.2)}
        shortcut="-"
        inactiveClassName={toolBtnInactive}
      />
      <ToolbarToolBtn
        icon={<FiMaximize />}
        label="Fit"
        onClick={handleFitToScreen}
        shortcut="F"
        inactiveClassName={toolBtnInactive}
      />
      <button
        type="button"
        onClick={() =>
          setCircuitWireLabelsVisible(circuit.wireLabelsVisible === false)
        }
        title="Toggle wire labels (W1, custom text). Cmd: labels | labels on | labels off"
        className={`rounded px-1.5 py-1 text-[10px] font-semibold ${
          circuit.wireLabelsVisible !== false
            ? 'bg-sky-600/90 text-white'
            : `${toolBtnInactive} opacity-70`
        }`}
      >
        <span className="inline-flex items-center gap-0.5">
          <FiTag className="inline" size={12} />
          Labels
        </span>
      </button>

      <ToolbarDivider className={dividerClass} />

      <ToolbarToolBtn
        icon={<FiPlay />}
        label="Simulate"
        onClick={runSimulation}
        inactiveClassName={toolBtnInactive}
      />

      <ToolbarDivider className={dividerClass} />

      <ToolbarToolBtn
        icon={theme === 'dark' ? <FiSun /> : <FiMoon />}
        label={theme === 'dark' ? 'Light' : 'Dark'}
        onClick={toggleTheme}
        inactiveClassName={toolBtnInactive}
      />

      <div className="flex-1" />

      <span className={`${tc.textMuted} text-xs mr-2`}>
        ⚡ ElectroSim
      </span>
    </div>
  );
};

export default Toolbar;
