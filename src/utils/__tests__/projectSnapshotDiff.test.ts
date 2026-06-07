import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../projectPersistence';
import { createEmptyCircuit } from '../../store/circuitDefaults';
import { diffProjects, visualDiffForSheet } from '../projectSnapshotDiff';
import { formatSnapshotDiffReport } from '../snapshotDiffExport';

describe('projectSnapshotDiff', () => {
  it('detects added and moved components', () => {
    const base = createEmptyProject('Test');
    const compare = structuredClone(base);
    const sheet = compare.sheets[0];
    sheet.circuit.components.push({
      id: 'c-new',
      type: 'mcb',
      label: 'Q2',
      x: 100,
      y: 100,
      rotation: 0,
      state: 'on',
      selected: false,
      connectionPoints: [],
      properties: {},
    });
    sheet.circuit.components.push({
      id: 'c-moved',
      type: 'lamp',
      label: 'L1',
      x: 200,
      y: 200,
      rotation: 0,
      state: 'on',
      selected: false,
      connectionPoints: [],
      properties: {},
    });

    const baseSheet = base.sheets[0];
    baseSheet.circuit.components.push({
      id: 'c-old',
      type: 'lamp',
      label: 'L1',
      x: 100,
      y: 100,
      rotation: 0,
      state: 'on',
      selected: false,
      connectionPoints: [],
      properties: {},
    });

    const diff = diffProjects(base, compare, 'Rev A', 'Current');
    expect(diff.summary.componentsAdded).toBe(1);
    expect(diff.summary.componentsMoved).toBe(1);

    const visual = visualDiffForSheet(diff, sheet.name);
    expect(visual?.added).toHaveLength(1);
    expect(visual?.moved).toHaveLength(1);
  });

  it('includes wire markers with geometry', () => {
    const base = createEmptyProject('Wire');
    const compare = structuredClone(base);
    const baseSheet = base.sheets[0];
    const compareSheet = compare.sheets[0];
    baseSheet.circuit.components.push(
      {
        id: 'a',
        type: 'junction',
        label: 'J1',
        x: 0,
        y: 0,
        rotation: 0,
        state: 'on',
        selected: false,
        connectionPoints: [{ id: 'p1', label: '1', x: 0, y: 0 }],
        properties: {},
      },
      {
        id: 'b',
        type: 'junction',
        label: 'J2',
        x: 100,
        y: 0,
        rotation: 0,
        state: 'on',
        selected: false,
        connectionPoints: [{ id: 'p2', label: '1', x: 0, y: 0 }],
        properties: {},
      }
    );
    compareSheet.circuit.components.push(...baseSheet.circuit.components);
    compareSheet.circuit.wires.push({
      id: 'w1',
      fromComponentId: 'a',
      fromPointId: 'p1',
      toComponentId: 'b',
      toPointId: 'p2',
      points: [0, 0, 100, 0],
      color: 'black',
    });

    const diff = diffProjects(base, compare, 'Rev A', 'Current');
    expect(diff.summary.wiresAdded).toBe(1);
    const visual = visualDiffForSheet(diff, compareSheet.name);
    expect(visual?.wires).toHaveLength(1);
    expect(visual?.wires[0].points).toEqual([0, 0, 100, 0]);
  });

  it('exports a text summary', () => {
    const base = createEmptyProject('P');
    const compare = createEmptyProject('P');
    compare.sheets[0].circuit = {
      ...createEmptyCircuit(),
      components: [
        {
          id: 'x',
          type: 'junction',
          label: 'J1',
          x: 0,
          y: 0,
          rotation: 0,
          state: 'on',
          selected: false,
          connectionPoints: [],
          properties: {},
        },
      ],
      wires: [],
    };
    const diff = diffProjects(base, compare, 'Rev A', 'Rev B');
    const text = formatSnapshotDiffReport(diff, 'Rev B');
    expect(text).toContain('Revision compare');
    expect(text).toContain('Components added');
  });
});
