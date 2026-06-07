/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SheetTabs from '../SheetTabs';
import { useCircuitStore } from '../../../store/circuitStore';
import { createEmptyProject } from '../../../utils/projectPersistence';
import { activeSheetCircuit } from '../../../utils/projectPersistence';
import { establishSheetSaveBaselines } from '../../../utils/sheetDirtyState';

describe('SheetTabs', () => {
  beforeEach(() => {
    const project = createEmptyProject('My Project');
    const circuit = activeSheetCircuit(project)!;
    useCircuitStore.setState({
      project,
      circuit,
      sheetSaveBaselines: establishSheetSaveBaselines(project),
    });
  });

  it('does not show the project name in the tab row', () => {
    render(<SheetTabs />);
    expect(screen.queryByText('My Project')).toBeNull();
    expect(screen.getByRole('button', { name: /sheet 1/i })).toBeTruthy();
  });

  it('marks the active tab with canvas-connected styling', () => {
    const { container } = render(<SheetTabs />);
    const activeTab = container.querySelector('.es-sheet-tab-active');
    expect(activeTab).toBeTruthy();
    expect(container.querySelector('.bg-blue-600')).toBeNull();
  });

  it('shows an unsaved indicator when the active sheet has edits', () => {
    const { circuit, project, sheetSaveBaselines } = useCircuitStore.getState();
    useCircuitStore.setState({
      circuit: {
        ...circuit,
        components: [
          ...circuit.components,
          {
            id: 'dirty-comp',
            type: 'mcb',
            x: 10,
            y: 10,
            rotation: 0,
            scale: 1,
            label: 'Q9',
            properties: {},
            connectionPoints: [],
          },
        ],
      },
      project,
      sheetSaveBaselines,
    });
    render(<SheetTabs />);
    expect(screen.getByLabelText('Unsaved changes')).toBeTruthy();
  });
});
