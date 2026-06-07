import { describe, expect, it } from 'vitest';
import nativeMenu from '../../../shared/nativeMenu.json';
import {
  isMenuActionId,
  menuActionLabel,
  MENU_ACTION_SHORTCUTS,
} from '../menuActionIds';

describe('menuActionIds', () => {
  it('recognizes every action id from nativeMenu.json', () => {
    const ids: string[] = [];
    const visit = (items: { type: string; id?: string }[]) => {
      for (const item of items) {
        if (item.type === 'action' && item.id) ids.push(item.id);
      }
    };
    for (const menu of nativeMenu.menus) visit(menu.items);
    visit(nativeMenu.darwinAppMenu.items);

    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(isMenuActionId(id)).toBe(true);
      expect(menuActionLabel(id as Parameters<typeof menuActionLabel>[0])).toBeTruthy();
    }
  });

  it('rejects unknown action ids', () => {
    expect(isMenuActionId('not-a-real-action')).toBe(false);
  });

  it('maps common shortcuts for the in-app menu bar', () => {
    expect(MENU_ACTION_SHORTCUTS.save).toBe('Ctrl+S');
    expect(MENU_ACTION_SHORTCUTS['command-palette']).toBe('Ctrl+K');
  });
});
