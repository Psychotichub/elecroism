/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MENU_ACTION_SHORTCUTS } from '../menuActionIds';
import { executeShortcutAction } from '../../shortcuts/executeShortcutAction';
import { useGlobalEditorShortcuts } from '../../hooks/useGlobalEditorShortcuts';
import { useCircuitStore } from '../../store/circuitStore';
import { useUiStore } from '../../store/uiStore';
import { useShortcutStore } from '../../store/shortcutStore';
import { dolMotorStarter } from '../../examples/exampleCircuits';
import { dispatchKey } from '../../test/keyboardEvent';

function ShortcutHost() {
  useGlobalEditorShortcuts();
  return null;
}

describe('shortcut menu regression', () => {
  beforeEach(() => {
    useShortcutStore.getState().resetAllBindings();
    useShortcutStore.getState().resetToolbarSlots();
    useUiStore.setState({
      commandPaletteOpen: false,
      sidebarCollapsed: false,
      propertyPanelCollapsed: false,
    });
    useCircuitStore.getState().loadCircuit(dolMotorStarter());
  });

  it('resolves default bindings for menu actions listed in MENU_ACTION_SHORTCUTS', () => {
    const store = useShortcutStore.getState();
    const cases = [
      { binding: MENU_ACTION_SHORTCUTS.new, action: 'new' as const, key: 'n' },
      { binding: MENU_ACTION_SHORTCUTS.save, action: 'save' as const, key: 's' },
      { binding: MENU_ACTION_SHORTCUTS.undo, action: 'undo' as const, key: 'z' },
      {
        binding: MENU_ACTION_SHORTCUTS['command-palette'],
        action: 'command-palette' as const,
        key: 'k',
      },
    ];

    for (const { binding, action, key } of cases) {
      expect(binding).toBeTruthy();
      const resolved = store.findActionForEvent(
        new KeyboardEvent('keydown', { key, ctrlKey: true })
      );
      expect(resolved).toBe(action);
    }
  });

  it('Ctrl+N still clears the circuit after menu wiring changes', async () => {
    expect(useCircuitStore.getState().circuit.components.length).toBeGreaterThan(0);

    await executeShortcutAction('new');

    expect(useCircuitStore.getState().circuit.components).toHaveLength(0);
  });

  it('global editor shortcut handler dispatches Ctrl+N to new project', () => {
    render(React.createElement(ShortcutHost));

    dispatchKey({ key: 'n', ctrlKey: true });

    expect(useCircuitStore.getState().circuit.components).toHaveLength(0);
  });

  it('global editor shortcut handler dispatches Ctrl+K to command palette', () => {
    render(React.createElement(ShortcutHost));

    dispatchKey({ key: 'k', ctrlKey: true });

    expect(useUiStore.getState().commandPaletteOpen).toBe(true);
  });
});
