import React from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import type { ToolMode } from '../../types';
import { useShortcutStore } from '../../store/shortcutStore';
import { executeShortcutAction } from '../../shortcuts/executeShortcutAction';
import { getToolbarActionMeta } from '../../shortcuts/toolbarActionMeta';
import type { ShortcutActionId } from '../../shortcuts/shortcutRegistry';
import { MOTION_CLASS } from '../../design/motion';
import {
  AppIcon,
  Button,
  IconButton,
  SegmentedControl,
  Tooltip,
  type SegmentItem,
} from '../ui';
import { cn } from '../ui/cn';

const TOOL_IDS = ['select', 'wire', 'delete', 'pan'] as const satisfies readonly ToolMode[];
type ToolId = (typeof TOOL_IDS)[number];

/** Actions rendered elsewhere in the shell — hide from customizable slots. */
const BUILTIN_TOOLBAR_ACTIONS = new Set<ShortcutActionId>([
  'run-simulation',
  'tool-select',
  'tool-wire',
  'tool-delete',
  'tool-pan',
  'cycle-theme',
]);

const TOOL_SEGMENTS: SegmentItem<ToolId>[] = [
  { id: 'select', label: 'Select', icon: <AppIcon id="tool-select" /> },
  { id: 'wire', label: 'Wire', icon: <AppIcon id="tool-wire" /> },
  { id: 'delete', label: 'Delete', icon: <AppIcon id="tool-delete" /> },
  { id: 'pan', label: 'Pan', icon: <AppIcon id="tool-pan" /> },
];

const TOOL_ACTION: Record<ToolId, ShortcutActionId> = {
  select: 'tool-select',
  wire: 'tool-wire',
  delete: 'tool-delete',
  pan: 'tool-pan',
};

function isToolId(value: ToolMode): value is ToolId {
  return (TOOL_IDS as readonly ToolMode[]).includes(value);
}

const ToolbarDivider: React.FC = () => (
  <div className="mx-1 h-5 w-px bg-es-divider" aria-hidden />
);

const Toolbar: React.FC = () => {
  const { tool, setTool, simulationPending } = useCircuitStore();
  const getBinding = useShortcutStore((s) => s.getBinding);
  const toolbarSlots = useShortcutStore((s) => s.toolbarSlots);
  const setSettingsOpen = useShortcutStore((s) => s.setSettingsOpen);

  const runSlot = (id: ShortcutActionId) => {
    void executeShortcutAction(id);
  };

  const toolSegments: SegmentItem<ToolId>[] = TOOL_SEGMENTS.map((s) => ({
    ...s,
    shortcut: getBinding(TOOL_ACTION[s.id]),
  }));

  const activeTool: ToolId = isToolId(tool) ? tool : 'select';

  return (
    <div className="flex h-10 select-none items-center gap-1 border-b border-es-borderSubtle bg-es-chrome1 px-2">
      <SegmentedControl
        ariaLabel="Drawing tools"
        items={toolSegments}
        value={activeTool}
        onChange={(id) => setTool(id)}
      />

      <ToolbarDivider />

      {toolbarSlots.map((slotId, index) => {
        if (!slotId || BUILTIN_TOOLBAR_ACTIONS.has(slotId)) return null;
        const meta = getToolbarActionMeta(slotId);

        return (
          <IconButton
            key={`slot-${index}-${slotId}`}
            label={
              getBinding(slotId)
                ? `${meta.label} (${getBinding(slotId)})`
                : meta.label
            }
            onClick={() => runSlot(slotId)}
          >
            {meta.icon}
          </IconButton>
        );
      })}

      <div className="flex-1" />

      <Tooltip
        content={
          getBinding('run-simulation')
            ? `Simulate (${getBinding('run-simulation')})`
            : 'Simulate'
        }
      >
        <Button
          variant="primary"
          size="md"
          onClick={() => runSlot('run-simulation')}
          disabled={simulationPending}
          className={cn('gap-1.5', simulationPending && MOTION_CLASS.simulatePulse)}
        >
          <span className="es-icon-inline">
            <AppIcon id="simulate" size="inline" />
          </span>
          <span>{simulationPending ? 'Running…' : 'Simulate'}</span>
        </Button>
      </Tooltip>

      <ToolbarDivider />

      <IconButton
        label={
          getBinding('shortcut-settings')
            ? `Shortcuts (${getBinding('shortcut-settings')})`
            : 'Shortcuts'
        }
        onClick={() => setSettingsOpen(true)}
      >
        <AppIcon id="settings" />
      </IconButton>
    </div>
  );
};

export default Toolbar;
