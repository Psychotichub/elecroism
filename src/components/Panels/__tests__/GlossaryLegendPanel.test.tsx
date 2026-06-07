/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import GlossaryLegendPanel from '../GlossaryLegendPanel';
import { useCircuitStore } from '../../../store/circuitStore';
import { createEmptyProject, activeSheetCircuit } from '../../../utils/projectPersistence';
import { establishSheetSaveBaselines } from '../../../utils/sheetDirtyState';

describe('GlossaryLegendPanel', () => {
  beforeEach(() => {
    const project = createEmptyProject('Legend test');
    const circuit = activeSheetCircuit(project)!;
    circuit.components.push({
      id: 'mcb-1',
      type: 'mcb',
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      label: 'Q1',
      properties: {},
      connectionPoints: [],
    });
    useCircuitStore.setState({
      project,
      circuit,
      sheetSaveBaselines: establishSheetSaveBaselines(project),
    });
  });

  it('renders glossary category chips', () => {
    render(<GlossaryLegendPanel />);
    expect(screen.getByTestId('glossary-category-chips')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'All' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Protection' })).toBeTruthy();
  });

  it('shows legend table and sticky export footer with secondary buttons', () => {
    render(<GlossaryLegendPanel />);
    fireEvent.click(screen.getByRole('tab', { name: /Legend/i }));
    expect(screen.getByTestId('panel-data-table')).toBeTruthy();
    expect(screen.getByTestId('panel-export-footer')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Copy text/i })).toBeTruthy();
    expect(screen.getByText('Q1')).toBeTruthy();
  });
});
