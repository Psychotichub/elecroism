/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import StatusBar from '../StatusBar';
import { useCircuitStore } from '../../../store/circuitStore';
import { createEmptyProject, activeSheetCircuit } from '../../../utils/projectPersistence';
import { establishSheetSaveBaselines } from '../../../utils/sheetDirtyState';

describe('StatusBar zones', () => {
  beforeEach(() => {
    const project = createEmptyProject('Zone Test');
    const circuit = activeSheetCircuit(project)!;
    useCircuitStore.setState({
      project,
      circuit,
      sheetSaveBaselines: establishSheetSaveBaselines(project),
      simulationResult: {
        totalPowerW: 1200,
        totalCurrentA: 5.25,
        faults: [],
        nodeVoltages: {},
        branchCurrents: {},
        componentStates: {},
      },
    });
  });

  it('renders left, center, and right zones', () => {
    render(<StatusBar />);
    expect(screen.getByTestId('status-zone-left')).toBeTruthy();
    expect(screen.getByTestId('status-zone-center')).toBeTruthy();
    expect(screen.getByTestId('status-zone-right')).toBeTruthy();
  });

  it('places CAD command input in the left zone', () => {
    render(<StatusBar />);
    const left = screen.getByTestId('status-zone-left');
    expect(within(left).getByLabelText('CAD command')).toBeTruthy();
    expect(within(left).getByText('Zone Test')).toBeTruthy();
    expect(within(left).getByText(/tool:/i)).toBeTruthy();
  });

  it('shows simulation metrics with tabular nums in the center zone', () => {
    render(<StatusBar />);
    const center = screen.getByTestId('status-zone-center');
    expect(within(center).getByText(/1200\.0W/)).toBeTruthy();
    expect(within(center).getByText(/5\.25A/)).toBeTruthy();
    expect(center.querySelector('.es-tabular-nums')).toBeTruthy();
  });

  it('shows brand mark only in the wide-screen brand slot', () => {
    render(<StatusBar />);
    const brand = screen.getByTestId('status-zone-right').querySelector(
      '.es-status-brand'
    );
    expect(brand).toBeTruthy();
    expect(brand?.className).toContain('min-[1200px]:inline-flex');
    expect(brand?.textContent).toContain('ElectroSim');
  });
});
