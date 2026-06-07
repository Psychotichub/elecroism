import { describe, expect, it } from 'vitest';
import { createEmptyCircuit } from '../../store/circuitDefaults';
import { createEmptyProject } from '../projectPersistence';
import {
  establishSheetSaveBaselines,
  isAnySheetDirty,
  isSheetDirty,
  sheetCircuitFingerprint,
} from '../sheetDirtyState';

describe('sheetDirtyState', () => {
  it('ignores zoom and pan in fingerprints', () => {
    const base = createEmptyCircuit();
    const zoomed = { ...base, zoom: 2.5, panX: 100, panY: -50 };
    expect(sheetCircuitFingerprint(base)).toBe(sheetCircuitFingerprint(zoomed));
  });

  it('detects dirty active sheet after edit', () => {
    const project = createEmptyProject('Test');
    const baselines = establishSheetSaveBaselines(project);
    const circuit = { ...project.sheets[0]!.circuit };
    expect(
      isSheetDirty(project.activeSheetId, project, circuit, baselines)
    ).toBe(false);

    circuit.components = [
      ...circuit.components,
      {
        id: 'c1',
        type: 'mcb',
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        label: 'Q1',
        properties: {},
        connectionPoints: [],
      },
    ];
    expect(
      isSheetDirty(project.activeSheetId, project, circuit, baselines)
    ).toBe(true);
    expect(isAnySheetDirty(project, circuit, baselines)).toBe(true);
  });

  it('marks new sheets without baselines as dirty', () => {
    const project = createEmptyProject('Test');
    const baselines = establishSheetSaveBaselines(project);
    const newSheetId = 'new-sheet-id';
    const extended = {
      ...project,
      sheets: [
        ...project.sheets,
        {
          id: newSheetId,
          name: 'Sheet 2',
          sortOrder: 1,
          circuit: createEmptyCircuit(),
        },
      ],
    };
    expect(isSheetDirty(newSheetId, extended, createEmptyCircuit(), baselines)).toBe(
      true
    );
  });
});
