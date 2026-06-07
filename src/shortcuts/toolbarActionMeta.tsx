import React from 'react';
import AppIcon from '../design/AppIcon';
import type { SemanticIconId } from '../design/icons';
import type { ShortcutActionId } from './shortcutRegistry';
import { shortcutActionLabel } from './shortcutRegistry';

export interface ToolbarActionMeta {
  icon: React.ReactNode;
  label: string;
}

const SHORTCUT_ICONS: Partial<Record<ShortcutActionId, SemanticIconId>> = {
  'tool-select': 'tool-select',
  'tool-wire': 'tool-wire',
  'tool-delete': 'tool-delete',
  'tool-pan': 'tool-pan',
  undo: 'undo',
  redo: 'redo',
  'run-simulation': 'simulate',
  'fit-screen': 'fit-screen',
  'zoom-in': 'zoom-in',
  'command-palette': 'command-palette',
  'toggle-object-snap': 'toggle-object-snap',
  'export-pdf': 'export-pdf',
  'cycle-theme': 'cycle-theme',
};

export function getToolbarActionMeta(id: ShortcutActionId): ToolbarActionMeta {
  const iconId = SHORTCUT_ICONS[id] ?? 'simulate';
  return {
    icon: <AppIcon id={iconId} size="toolbar" />,
    label: shortcutActionLabel(id),
  };
}
