import { beforeEach, describe, expect, it } from 'vitest';
import { useCircuitStore } from '../../store/circuitStore';
import { useUiStore } from '../../store/uiStore';
import { executeMenuAction } from '../executeMenuAction';

describe('executeMenuAction', () => {
  beforeEach(() => {
    useCircuitStore.setState({
      circuit: {
        ...useCircuitStore.getState().circuit,
        name: 'Test circuit',
        components: [],
        wires: [],
      },
      selectedId: null,
    });
    useUiStore.setState({
      commandPaletteOpen: false,
      sidebarCollapsed: false,
      propertyPanelCollapsed: false,
    });
  });

  it('returns false for unknown ids', async () => {
    expect(await executeMenuAction('bogus')).toBe(false);
  });

  it('dispatches command-palette to the UI store', async () => {
    expect(await executeMenuAction('command-palette')).toBe(true);
    expect(useUiStore.getState().commandPaletteOpen).toBe(true);
  });

  it('dispatches toggle-sidebar to the UI store', async () => {
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
    expect(await executeMenuAction('toggle-sidebar')).toBe(true);
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  it('dispatches new to clear the circuit', async () => {
    useCircuitStore.setState({
      circuit: {
        ...useCircuitStore.getState().circuit,
        components: [
          {
            id: 'c1',
            type: 'lamp',
            x: 0,
            y: 0,
            rotation: 0,
            selected: false,
            props: {},
          },
        ],
      },
    });
    expect(await executeMenuAction('new')).toBe(true);
    expect(useCircuitStore.getState().circuit.components).toHaveLength(0);
  });
});
