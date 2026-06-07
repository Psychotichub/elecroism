/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppMenuBar from '../AppMenuBar';
import { useCircuitStore } from '../../../store/circuitStore';
import { useUiStore } from '../../../store/uiStore';
import { useShortcutStore } from '../../../store/shortcutStore';
import { useThemeStore } from '../../../store/themeStore';
import { dolMotorStarter } from '../../../examples/exampleCircuits';

async function openTopMenu(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.hover(screen.getByRole('menuitem', { name: label }));
  await waitFor(() => {
    expect(screen.getByRole('menuitem', { name: label })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });
}

/** Nested submenus listen for `mouseenter` on the row wrapper, not the button. */
function hoverSubmenuRow(label: string, root: HTMLElement = document.body) {
  const item = within(root).getByRole('menuitem', { name: label });
  const row = item.parentElement;
  if (!row) throw new Error(`Submenu row not found for ${label}`);
  fireEvent.mouseEnter(row);
}

function menuActionByPrimaryLabel(label: string, root: HTMLElement = document.body) {
  const items = within(root).getAllByRole('menuitem');
  const match = items.find((el) => {
    const primary =
      el.querySelector('.truncate')?.textContent?.trim() ??
      el.querySelector('span')?.textContent?.trim();
    return primary === label || primary === `✓ ${label}`;
  });
  if (!match) throw new Error(`Menu action "${label}" not found`);
  return match;
}

describe('AppMenuBar', () => {
  beforeEach(() => {
    useShortcutStore.getState().resetAllBindings();
    useShortcutStore.getState().resetToolbarSlots();
    useUiStore.setState({
      sidebarCollapsed: false,
      propertyPanelCollapsed: false,
      commandPaletteOpen: false,
    });
    useCircuitStore.getState().loadCircuit(dolMotorStarter());
  });

  it('opens File → New and clears the circuit via clearCircuit', async () => {
    const user = userEvent.setup();
    expect(useCircuitStore.getState().circuit.components.length).toBeGreaterThan(0);

    render(<AppMenuBar />);

    await openTopMenu(user, 'File');
    fireEvent.click(menuActionByPrimaryLabel('New'));

    expect(useCircuitStore.getState().circuit.components).toHaveLength(0);
    expect(useCircuitStore.getState().circuit.wires).toHaveLength(0);
  });

  it('shows default shortcut hints on core File menu actions', async () => {
    const user = userEvent.setup();
    render(<AppMenuBar />);

    await openTopMenu(user, 'File');

    expect(menuActionByPrimaryLabel('New')).toHaveTextContent('Ctrl+N');
    expect(menuActionByPrimaryLabel('Save')).toHaveTextContent('Ctrl+S');
  });

  it('groups learning content under Insert → Learning with nested submenus', async () => {
    const user = userEvent.setup();
    render(<AppMenuBar />);

    await openTopMenu(user, 'Insert');
    const insertMenu = screen.getByRole('menu');
    hoverSubmenuRow('Learning', insertMenu);
    await waitFor(() => {
      expect(
        within(insertMenu).getByRole('menuitem', { name: 'Tutorials' })
      ).toBeInTheDocument();
      expect(
        within(insertMenu).getByRole('menuitem', { name: 'Challenges' })
      ).toBeInTheDocument();
      expect(
        within(insertMenu).getByRole('menuitem', { name: 'Classroom' })
      ).toBeInTheDocument();
    });
  });

  it('opens Insert → Examples and loads a built-in circuit', async () => {
    const user = userEvent.setup();
    useCircuitStore.getState().clearCircuit();
    expect(useCircuitStore.getState().circuit.components).toHaveLength(0);

    render(<AppMenuBar />);

    await openTopMenu(user, 'Insert');
    const insertMenu = screen.getByRole('menu');
    hoverSubmenuRow('Examples', insertMenu);
    await waitFor(() => {
      expect(within(insertMenu).getByRole('menuitem', { name: 'Lighting' })).toBeInTheDocument();
    });
    hoverSubmenuRow('Lighting', insertMenu);
    await waitFor(() => {
      expect(
        screen.getByRole('menuitem', { name: 'Simple Lighting Circuit' })
      ).toBeInTheDocument();
    });
    fireEvent.click(menuActionByPrimaryLabel('Simple Lighting Circuit'));

    expect(useCircuitStore.getState().circuit.components.length).toBeGreaterThan(0);
  });

  it('toggles sheet tab bar visibility from View → Appearance', async () => {
    const user = userEvent.setup();
    useUiStore.getState().setShowSheetTabBar(true);
    render(<AppMenuBar />);

    await openTopMenu(user, 'View');
    const viewMenu = screen.getByRole('menu');
    hoverSubmenuRow('Appearance', viewMenu);
    await waitFor(() => {
      expect(
        menuActionByPrimaryLabel('Show sheet tab bar', viewMenu)
      ).toBeInTheDocument();
    });
    fireEvent.click(menuActionByPrimaryLabel('Show sheet tab bar', viewMenu));

    expect(useUiStore.getState().showSheetTabBar).toBe(false);
  });

  it('opens View → Appearance and sets theme from the submenu', async () => {
    const user = userEvent.setup();
    useThemeStore.getState().setTheme('dark');
    render(<AppMenuBar />);

    await openTopMenu(user, 'View');
    const viewMenu = screen.getByRole('menu');
    hoverSubmenuRow('Appearance', viewMenu);
    await waitFor(() => {
      expect(
        within(viewMenu).getByRole('menuitem', { name: /Light/i })
      ).toBeInTheDocument();
    });
    fireEvent.click(menuActionByPrimaryLabel('Light', viewMenu));

    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('opens Window → Hide component palette and toggles the sidebar', async () => {
    const user = userEvent.setup();
    render(<AppMenuBar />);

    await openTopMenu(user, 'Window');
    fireEvent.click(
      screen.getByRole('menuitem', { name: /Hide component palette/i })
    );

    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });
});
