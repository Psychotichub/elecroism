/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PropertyPanel from '../../PropertyPanel';
import { useCircuitStore } from '../../../../store/circuitStore';
import { createEmptyProject, activeSheetCircuit } from '../../../../utils/projectPersistence';
import { establishSheetSaveBaselines } from '../../../../utils/sheetDirtyState';

vi.mock('../../CrossSheetBacklinksSection', () => ({
  default: () => null,
}));

vi.mock('../TypeSpecificProps', () => ({
  TypeSpecificProps: () => <div data-testid="type-specific-props" />,
  BmsTypeSpecificProps: () => <div data-testid="bms-type-specific-props" />,
}));

describe('PropertyPanel sections', () => {
  beforeEach(() => {
    const project = createEmptyProject('Test');
    const circuit = activeSheetCircuit(project)!;
    circuit.components.push({
      id: 'motor-1',
      type: 'motor',
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      label: 'M1',
      properties: { power: 1000 },
      connectionPoints: [],
    });
    useCircuitStore.setState({
      project,
      circuit,
      sheetSaveBaselines: establishSheetSaveBaselines(project),
      selectedId: 'motor-1',
      simulationResult: {
        success: true,
        nodes: {
          'motor-1': {
            voltageV: 230,
            currentA: 4.3,
            powerW: 1000,
            energized: true,
          },
        },
        faults: [],
        timestamp: Date.now(),
        totalPowerW: 1000,
        totalCurrentA: 4.3,
      },
    });
  });

  it('renders a selection header card with label and energized status', () => {
    render(<PropertyPanel />);
    expect(screen.getByTestId('selection-header-card')).toBeTruthy();
    expect(screen.getByText('M1')).toBeTruthy();
    expect(screen.getByText('Energized')).toBeTruthy();
  });

  it('shows help popover instead of inline help wall', () => {
    render(<PropertyPanel />);
    expect(screen.queryByText(/Features/i)).toBeNull();
    expect(screen.getByTestId('component-help-trigger')).toBeTruthy();
    fireEvent.click(screen.getByTestId('component-help-trigger'));
    expect(screen.getByTestId('component-help-popover')).toBeTruthy();
  });

  it('groups fields into accordion sections', () => {
    render(<PropertyPanel />);
    expect(screen.getByTestId('property-section-documentation')).toBeTruthy();
    expect(screen.getByTestId('property-section-electrical')).toBeTruthy();
    expect(screen.getByTestId('property-section-mechanical')).toBeTruthy();
  });
});
