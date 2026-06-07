import { beforeEach, describe, expect, it } from 'vitest';
import { useShortcutStore } from '../shortcutStore';

function keyEvent(init: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): KeyboardEvent {
  return {
    key: init.key,
    ctrlKey: init.ctrlKey ?? false,
    metaKey: init.metaKey ?? false,
    shiftKey: false,
    altKey: false,
  } as KeyboardEvent;
}

describe('shortcutStore', () => {
  beforeEach(() => {
    useShortcutStore.getState().resetAllBindings();
    useShortcutStore.getState().resetToolbarSlots();
  });

  it('returns default bindings when no override exists', () => {
    expect(useShortcutStore.getState().getBinding('save')).toBe('Ctrl+S');
  });

  it('stores custom bindings and detects conflicts', () => {
    const store = useShortcutStore.getState();
    store.setBinding('save', 'Ctrl+Shift+S');
    expect(store.getBinding('save')).toBe('Ctrl+Shift+S');
    expect(store.findConflict('Ctrl+Shift+S', 'undo')).toBe('save');
  });

  it('resolves actions from keyboard events', () => {
    const store = useShortcutStore.getState();
    const action = store.findActionForEvent(
      keyEvent({ key: 's', ctrlKey: true })
    );
    expect(action).toBe('save');
  });

  it('persists toolbar slot updates', () => {
    const store = useShortcutStore.getState();
    store.setToolbarSlot(0, 'run-simulation');
    expect(useShortcutStore.getState().toolbarSlots[0]).toBe('run-simulation');
  });
});
