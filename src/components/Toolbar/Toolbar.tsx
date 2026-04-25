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
} from 'react-icons/fi';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import type { ToolMode } from '../../types';

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
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          const { selectedId, removeComponent, removeWire } =
            useCircuitStore.getState();
          if (selectedId) {
            const isWire = circuit.wires.some(
              (w) => w.id === selectedId
            );
            if (isWire) {
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
