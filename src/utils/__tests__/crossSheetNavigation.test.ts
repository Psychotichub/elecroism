import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../projectPersistence';
import { createEmptyCircuit } from '../../store/circuitDefaults';
import {
  collectBacklinksToSheet,
  collectCrossSheetReferences,
  findProjectSheetByName,
  parseCrossSheetReference,
  resolveCrossSheetTargetBounds,
  validateCrossSheetReferences,
} from '../crossSheetNavigation';

describe('crossSheetNavigation', () => {
  it('parses sheet references', () => {
    expect(parseCrossSheetReference('=Sheet2!')).toEqual({
      raw: '=Sheet2!',
      sheetName: 'Sheet2',
      target: undefined,
    });
    expect(parseCrossSheetReference('=Sheet 2!Q1')).toEqual({
      raw: '=Sheet 2!Q1',
      sheetName: 'Sheet 2',
      target: 'Q1',
    });
  });

  it('finds sheets by normalized name', () => {
    const project = createEmptyProject('Test');
    project.sheets[0].name = 'Sheet 1';
    const sheet2 = {
      id: 's2',
      name: 'Sheet 2',
      sortOrder: 1,
      circuit: createEmptyCircuit(),
    };
    project.sheets.push(sheet2);
    expect(findProjectSheetByName(project, 'Sheet2')?.id).toBe('s2');
  });

  it('collects backlinks and validates broken targets', () => {
    const project = createEmptyProject('Test');
    project.sheets[0].name = 'Power';
    const target = project.sheets[0];
    const sourceCircuit = createEmptyCircuit();
    sourceCircuit.components.push({
      id: 'c1',
      type: 'junction',
      label: 'J1',
      x: 0,
      y: 0,
      rotation: 0,
      state: 'on',
      selected: false,
      connectionPoints: [],
      properties: { crossSheetRef: '=Power!Missing' },
    });
    project.sheets.push({
      id: 's2',
      name: 'Control',
      sortOrder: 1,
      circuit: sourceCircuit,
    });
    project.activeSheetId = target.id;

    const refs = collectCrossSheetReferences(
      sourceCircuit,
      's2',
      'Control'
    );
    expect(refs).toHaveLength(1);
    expect(refs[0].parsed.raw).toBe('=Power!Missing');

    const backlinks = collectBacklinksToSheet(project, target.id);
    expect(backlinks).toHaveLength(1);

    const issues = validateCrossSheetReferences(project);
    expect(issues.some((i) => i.message.includes('Missing'))).toBe(true);
  });

  it('resolves component target bounds', () => {
    const circuit = createEmptyCircuit();
    circuit.components.push({
      id: 'q1',
      type: 'mcb',
      label: 'Q1',
      x: 200,
      y: 100,
      rotation: 0,
      state: 'on',
      selected: false,
      connectionPoints: [],
      properties: {},
    });
    const bounds = resolveCrossSheetTargetBounds(circuit, 'Q1');
    expect(bounds).not.toBeNull();
    expect(bounds!.minX).toBeLessThan(200);
    expect(bounds!.maxX).toBeGreaterThan(200);
  });
});
