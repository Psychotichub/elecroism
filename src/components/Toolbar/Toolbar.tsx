import React from 'react';
import {
  FiCornerUpLeft,
  FiCornerUpRight,
  FiEdit3,
  FiMaximize,
  FiMousePointer,
  FiMove,
  FiPlay,
  FiSun,
  FiMoon,
  FiTrash2,
} from 'react-icons/fi';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors, themeLabel } from '../../store/themeStore';

interface ToolbarToolBtnProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  shortcut?: string;
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
    aria-label={shortcut ? `${label} (${shortcut})` : label}
    aria-pressed={active ?? false}
    className={`flex items-center gap-1 rounded px-2 py-1.5 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
      active ? 'bg-blue-600 text-white' : inactiveClassName
    }`}
    title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const ToolbarDivider: React.FC<{ className: string }> = ({ className }) => (
  <div className={className} />
);

const Toolbar: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const cycleTheme = useThemeStore((s) => s.cycleTheme);
  const tc = themeColors[theme];

  const { tool, setTool, undo, redo, runSimulation } = useCircuitStore();

  const toolBtnInactive = `${tc.btnText} ${tc.itemHover}`;
  const dividerClass = `mx-1 h-5 w-px ${
    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
  }`;

  return (
    <div
      className={`flex h-10 select-none items-center gap-0.5 border-b px-2 shadow-sm ${tc.toolbar} ${tc.border}`}
    >
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
        icon={<FiPlay />}
        label="Simulate"
        onClick={runSimulation}
        inactiveClassName={toolBtnInactive}
      />

      <div className="flex-1" />

      <ToolbarToolBtn
        icon={
          theme === 'light' ? (
            <FiSun />
          ) : theme === 'dark' ? (
            <FiMoon />
          ) : (
            <FiMaximize />
          )
        }
        label={`Theme: ${themeLabel(theme)}`}
        onClick={cycleTheme}
        inactiveClassName={toolBtnInactive}
      />

    </div>
  );
};

export default Toolbar;
