import type { MenuActionId } from '../menu/menuActionIds';
import { menuActionLabel } from '../menu/menuActionIds';

/** Editor-only shortcuts not exposed in the native menu. */
export type EditorShortcutId =
  | 'tool-select'
  | 'tool-wire'
  | 'tool-delete'
  | 'tool-pan'
  | 'delete-selection'
  | 'toggle-wire-orientation'
  | 'shortcut-settings'
  | 'privacy-settings';

export type ShortcutActionId = MenuActionId | EditorShortcutId;

export type ShortcutCategory =
  | 'File'
  | 'Edit'
  | 'Tools'
  | 'View'
  | 'Simulate'
  | 'Window'
  | 'Help';

export interface ShortcutDefinition {
  id: ShortcutActionId;
  label: string;
  category: ShortcutCategory;
  defaultBinding: string | null;
  /** Shown on the customizable toolbar slot picker. */
  toolbarEligible: boolean;
}

const EDITOR_LABELS: Record<EditorShortcutId, string> = {
  'tool-select': 'Select tool',
  'tool-wire': 'Wire tool',
  'tool-delete': 'Delete tool',
  'tool-pan': 'Pan tool',
  'delete-selection': 'Delete selection',
  'toggle-wire-orientation': 'Toggle wire orientation',
  'shortcut-settings': 'Keyboard shortcuts…',
  'privacy-settings': 'Privacy settings…',
};

const EDITOR_CATEGORIES: Record<EditorShortcutId, ShortcutCategory> = {
  'tool-select': 'Tools',
  'tool-wire': 'Tools',
  'tool-delete': 'Tools',
  'tool-pan': 'Tools',
  'delete-selection': 'Edit',
  'toggle-wire-orientation': 'Tools',
  'shortcut-settings': 'Window',
  'privacy-settings': 'Window',
};

const EDITOR_DEFAULTS: Record<EditorShortcutId, string | null> = {
  'tool-select': 'V',
  'tool-wire': 'W',
  'tool-delete': 'E',
  'tool-pan': 'Space',
  'delete-selection': 'Delete',
  'toggle-wire-orientation': 'Tab',
  'shortcut-settings': null,
  'privacy-settings': null,
};

const MENU_CATEGORIES: Partial<Record<MenuActionId, ShortcutCategory>> = {
  new: 'File',
  open: 'File',
  save: 'File',
  'export-png': 'File',
  'export-pdf': 'File',
  'coordination-pdf': 'File',
  'export-documentation-pack': 'File',
  'export-wire-csv': 'File',
  'export-bom-csv': 'File',
  'export-terminal-csv': 'File',
  'export-cable-csv': 'File',
  'export-panel-schedule-csv': 'File',
  'export-panel-schedule-pdf': 'File',
  undo: 'Edit',
  redo: 'Edit',
  cut: 'Edit',
  copy: 'Edit',
  paste: 'Edit',
  'select-all': 'Edit',
  rotate: 'Edit',
  'zoom-in': 'View',
  'zoom-out': 'View',
  'fit-screen': 'View',
  'toggle-wire-labels': 'View',
  'toggle-connection-overlay': 'View',
  'toggle-arc-flash': 'View',
  'toggle-object-snap': 'View',
  'toggle-ortho': 'View',
  'toggle-grid-snap': 'View',
  'toggle-auto-route': 'View',
  'toggle-sld-view': 'View',
  'export-sld-pdf': 'File',
  'cycle-theme': 'View',
  'run-simulation': 'Simulate',
  'toggle-sidebar': 'Window',
  'toggle-inspector': 'Window',
  'command-palette': 'Window',
  about: 'Help',
  'check-for-updates': 'Help',
};

const MENU_DEFAULTS: Partial<Record<MenuActionId, string>> = {
  new: 'Ctrl+N',
  open: 'Ctrl+O',
  save: 'Ctrl+S',
  undo: 'Ctrl+Z',
  redo: 'Ctrl+Y',
  cut: 'Ctrl+X',
  copy: 'Ctrl+C',
  paste: 'Ctrl+V',
  'select-all': 'Ctrl+A',
  rotate: 'R',
  'zoom-in': '+',
  'zoom-out': '-',
  'fit-screen': 'F',
  'toggle-object-snap': 'F3',
  'toggle-ortho': 'F8',
  'toggle-grid-snap': 'F9',
  'command-palette': 'Ctrl+K',
};

const MENU_ORDER: MenuActionId[] = [
  'new',
  'open',
  'save',
  'export-png',
  'export-pdf',
  'coordination-pdf',
  'export-documentation-pack',
  'export-wire-csv',
  'export-bom-csv',
  'export-terminal-csv',
  'export-cable-csv',
  'export-panel-schedule-csv',
  'export-panel-schedule-pdf',
  'undo',
  'redo',
  'cut',
  'copy',
  'paste',
  'select-all',
  'rotate',
  'zoom-in',
  'zoom-out',
  'fit-screen',
  'toggle-wire-labels',
  'toggle-connection-overlay',
  'toggle-arc-flash',
  'toggle-object-snap',
  'toggle-ortho',
  'toggle-grid-snap',
  'toggle-auto-route',
  'toggle-sld-view',
  'export-sld-pdf',
  'cycle-theme',
  'run-simulation',
  'toggle-sidebar',
  'toggle-inspector',
  'command-palette',
  'about',
  'check-for-updates',
];

const EDITOR_ORDER: EditorShortcutId[] = [
  'tool-select',
  'tool-wire',
  'tool-delete',
  'tool-pan',
  'delete-selection',
  'toggle-wire-orientation',
  'shortcut-settings',
  'privacy-settings',
];

const TOOLBAR_INELIGIBLE = new Set<ShortcutActionId>([
  'about',
  'check-for-updates',
  'shortcut-settings',
  'privacy-settings',
]);

function buildDefinitions(): ShortcutDefinition[] {
  const menuDefs: ShortcutDefinition[] = MENU_ORDER.map((id) => ({
    id,
    label: menuActionLabel(id),
    category: MENU_CATEGORIES[id] ?? 'Window',
    defaultBinding: MENU_DEFAULTS[id] ?? null,
    toolbarEligible: !TOOLBAR_INELIGIBLE.has(id),
  }));

  const editorDefs: ShortcutDefinition[] = EDITOR_ORDER.map((id) => ({
    id,
    label: EDITOR_LABELS[id],
    category: EDITOR_CATEGORIES[id],
    defaultBinding: EDITOR_DEFAULTS[id],
    toolbarEligible: id.startsWith('tool-') || id === 'delete-selection',
  }));

  return [...menuDefs, ...editorDefs];
}

export const SHORTCUT_DEFINITIONS = buildDefinitions();

export const SHORTCUT_DEFINITION_BY_ID = new Map(
  SHORTCUT_DEFINITIONS.map((d) => [d.id, d])
);

export const DEFAULT_TOOLBAR_SLOTS: (ShortcutActionId | null)[] = [
  'undo',
  'redo',
  'run-simulation',
  'fit-screen',
  'command-palette',
  'toggle-object-snap',
  'export-pdf',
  'zoom-in',
];

export const TOOLBAR_SLOT_COUNT = 8;

export function isShortcutActionId(value: string): value is ShortcutActionId {
  return SHORTCUT_DEFINITION_BY_ID.has(value as ShortcutActionId);
}

export function shortcutActionLabel(id: ShortcutActionId): string {
  return SHORTCUT_DEFINITION_BY_ID.get(id)?.label ?? id;
}
