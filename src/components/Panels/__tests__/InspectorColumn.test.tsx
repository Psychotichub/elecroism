/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import InspectorColumn from '../InspectorColumn';
import { useCircuitStore } from '../../../store/circuitStore';
import { createEmptyProject, activeSheetCircuit } from '../../../utils/projectPersistence';
import { establishSheetSaveBaselines } from '../../../utils/sheetDirtyState';

vi.mock('../PropertyPanel', () => ({
  default: () => <div data-testid="property-panel" />,
}));
vi.mock('../CircuitValidationPanel', () => ({
  default: () => <div data-testid="validation-panel" />,
}));
vi.mock('../DrawingLayersPanel', () => ({
  default: () => <div data-testid="layers-panel" />,
}));
vi.mock('../TccPlotterPanel', () => ({
  default: () => <div data-testid="tcc-panel" />,
}));
vi.mock('../OscilloscopePanel', () => ({
  default: () => <div data-testid="scope-panel" />,
}));
vi.mock('../BmsSimulatorPanel', () => ({
  default: () => <div data-testid="bms-panel" />,
}));
vi.mock('../CableSizingWizardPanel', () => ({
  default: () => <div data-testid="cable-panel" />,
}));
vi.mock('../GlossaryLegendPanel', () => ({
  default: () => <div data-testid="legend-panel" />,
}));

describe('InspectorColumn tab overflow', () => {
  beforeEach(() => {
    const project = createEmptyProject('Inspector');
    const circuit = activeSheetCircuit(project)!;
    useCircuitStore.setState({
      project,
      circuit,
      sheetSaveBaselines: establishSheetSaveBaselines(project),
      selectedId: null,
      simulationResult: null,
    });
    window.localStorage.setItem('electroism.inspectorTab.v1', 'properties');
  });

  it('shows primary tabs and hides analysis tabs behind overflow', () => {
    render(<InspectorColumn />);
    expect(screen.getByRole('tab', { name: 'Properties' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Validation' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Layers' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'TCC' })).toBeNull();
    expect(screen.getByTestId('tab-overflow-trigger')).toBeTruthy();
  });

  it('opens analysis overflow and shows TCC panel', () => {
    render(<InspectorColumn />);
    fireEvent.click(screen.getByTestId('tab-overflow-trigger'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'TCC' }));
    expect(screen.getByTestId('tcc-panel')).toBeTruthy();
  });
});
