import { describe, expect, it } from 'vitest';
import type { Circuit } from '../../types';
import { computeDrawingContentBounds } from '../drawingBounds';
import {
  buildSheetIndexRows,
  buildTitleBlock,
  resolveDrawingSheets,
  safeDrawingFileBase,
} from '../drawingExport';
import { makeCircuit, makeComponent } from '../../simulation/__tests__/testHelpers';

describe('drawingExport', () => {
  it('computes bounds including wire vertices', () => {
    const c = makeComponent('mcb', { x: 100, y: 100 });
    const circuit = makeCircuit([c], [
      {
        id: 'w1',
        fromComponentId: c.id,
        fromPointId: 'p1',
        toComponentId: 'x',
        toPointId: 'p2',
        points: [0, 0, 300, 0],
        color: 'brown',
        crossSection: 2.5,
        energized: false,
        currentAmps: 0,
      },
    ]);
    const bounds = computeDrawingContentBounds(circuit);
    expect(bounds).not.toBeNull();
    expect(bounds!.minX).toBeLessThanOrEqual(0);
    expect(bounds!.maxX).toBeGreaterThanOrEqual(300);
  });

  it('builds title block from circuit metadata', () => {
    const circuit: Circuit = {
      ...makeCircuit([], []),
      name: 'MCC Feeders',
      drawingProject: 'Site A',
      drawingNumber: 'EL-100',
      drawingRevision: 'B',
      drawnBy: 'JD',
      checkedBy: 'AK',
      updatedAt: '2026-06-07T12:00:00.000Z',
    };
    const tb = buildTitleBlock(circuit);
    expect(tb.project).toBe('Site A');
    expect(tb.drawingNumber).toBe('EL-100');
    expect(tb.revision).toBe('B');
    expect(tb.drawnBy).toBe('JD');
    expect(tb.checkedBy).toBe('AK');
  });

  it('defaults to a single full-drawing sheet', () => {
    const c = makeComponent('mcb', { x: 50, y: 80 });
    const circuit = makeCircuit([c], []);
    const sheets = resolveDrawingSheets(circuit);
    expect(sheets).toHaveLength(1);
    expect(sheets[0].sheetNumber).toBe(1);
    expect(sheets[0].bounds.minX).toBeLessThan(50);
    expect(sheets[0].bounds.maxX).toBeGreaterThan(50);
  });

  it('resolves multiple sheets with component crops', () => {
    const q1 = makeComponent('mcb', { x: 0, y: 0, label: 'Q1' });
    const q2 = makeComponent('mcb', { x: 400, y: 0, label: 'Q2' });
    const circuit: Circuit = {
      ...makeCircuit([q1, q2], []),
      drawingSheets: [
        {
          id: 's1',
          sheetNumber: 1,
          title: 'Incomer',
          reference: '=INC',
          componentIds: [q1.id],
        },
        {
          id: 's2',
          sheetNumber: 2,
          title: 'Feeders',
          reference: '=FDR',
          componentIds: [q2.id],
        },
      ],
    };
    const sheets = resolveDrawingSheets(circuit);
    expect(sheets).toHaveLength(2);
    expect(sheets[0].title).toBe('Incomer');
    expect(sheets[1].reference).toBe('=FDR');
    expect(sheets[0].bounds.maxX).toBeLessThan(sheets[1].bounds.minX);
    const index = buildSheetIndexRows(sheets);
    expect(index).toHaveLength(2);
    expect(index[1].sheetNumber).toBe(2);
  });

  it('sanitizes PDF filenames', () => {
    expect(safeDrawingFileBase('MCC / Panel #1')).toBe('MCC_Panel_1');
  });
});
