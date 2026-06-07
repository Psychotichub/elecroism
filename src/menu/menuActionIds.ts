import nativeMenu from '../../shared/nativeMenu.json';

/** Action ids dispatched from the native OS menu and renderer menu bar. */
export type MenuActionId =
  | 'new'
  | 'open'
  | 'save'
  | 'project-settings'
  | 'get-library-packs'
  | 'export-png'
  | 'export-pdf'
  | 'coordination-pdf'
  | 'export-documentation-pack'
  | 'export-wire-csv'
  | 'export-bom-csv'
  | 'export-terminal-csv'
  | 'export-cable-csv'
  | 'export-panel-schedule-csv'
  | 'export-panel-schedule-pdf'
  | 'export-review-comments-pdf'
  | 'export-review-comments-json'
  | 'undo'
  | 'redo'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'select-all'
  | 'rotate'
  | 'zoom-in'
  | 'zoom-out'
  | 'fit-screen'
  | 'toggle-wire-labels'
  | 'toggle-connection-overlay'
  | 'toggle-arc-flash'
  | 'toggle-object-snap'
  | 'toggle-ortho'
  | 'toggle-grid-snap'
  | 'toggle-auto-route'
  | 'toggle-sld-view'
  | 'export-sld-pdf'
  | 'cycle-theme'
  | 'run-simulation'
  | 'toggle-sidebar'
  | 'toggle-inspector'
  | 'command-palette'
  | 'about'
  | 'check-for-updates';

function collectActionIds(): Set<string> {
  const ids = new Set<string>();
  const visit = (items: { type: string; id?: string }[]) => {
    for (const item of items) {
      if (item.type === 'action' && item.id) ids.add(item.id);
    }
  };
  for (const menu of nativeMenu.menus) visit(menu.items);
  visit(nativeMenu.darwinAppMenu.items);
  return ids;
}

const KNOWN_IDS = collectActionIds();

export function isMenuActionId(value: string): value is MenuActionId {
  return KNOWN_IDS.has(value);
}

/** Map action id → display shortcut label for the in-app menu bar. */
export const MENU_ACTION_SHORTCUTS: Partial<Record<MenuActionId, string>> = {
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

/** Map action id → menu label from shared native menu definition. */
export function menuActionLabel(id: MenuActionId): string {
  const find = (items: { type: string; id?: string; label?: string }[]): string | null => {
    for (const item of items) {
      if (item.type === 'action' && item.id === id && item.label) return item.label;
    }
    return null;
  };
  for (const menu of nativeMenu.menus) {
    const label = find(menu.items);
    if (label) return label;
  }
  const darwin = find(nativeMenu.darwinAppMenu.items);
  return darwin ?? id;
}
