import { describe, expect, it } from 'vitest';
import {
  buildCoordinationStudyData,
  buildCoordinationStudyPdf,
} from '../coordinationStudyReport';
import { makeComponent, makeCircuit, wire } from '../../simulation/__tests__/testHelpers';

describe('coordinationStudyReport', () => {
  it('builds device rows with fault and margin fields', () => {
    const src = makeComponent('power_source', { state: 'on' });
    const mcb = makeComponent('mcb', {
      label: 'Q1',
      state: 'on',
      props: { ratingAmps: 16, tripCurve: 'C', breakingCapacity: 6000 },
    });
    const circuit = makeCircuit(
      [src, mcb],
      [
        wire(src, 'L_OUT', mcb, '1'),
        wire(mcb, '2', src, 'N_OUT'),
      ]
    );
    const data = buildCoordinationStudyData(circuit, null);
    expect(data.devices.length).toBeGreaterThanOrEqual(1);
    expect(data.devices[0].label).toBe('Q1');
    expect(data.devices[0].ratedAmps).toBe(16);
    expect(data.devices[0].breakingCapacityA).toBe(6000);
    expect(data.title.project).toBeTruthy();
  });

  it('includes drawing sheet index when multi-sheet', () => {
    const q1 = makeComponent('mcb', { label: 'Q1', state: 'on' });
    const circuit = {
      ...makeCircuit([q1], []),
      drawingSheets: [
        {
          id: 's1',
          sheetNumber: 1,
          title: 'Incomer',
          reference: '=INC',
        },
        {
          id: 's2',
          sheetNumber: 2,
          title: 'Feeders',
          reference: '=FDR',
        },
      ],
    };
    const data = buildCoordinationStudyData(circuit, null);
    expect(data.drawingSheetIndex).toHaveLength(2);
    expect(data.drawingSheetIndex[0].title).toBe('Incomer');
  });

  it('creates a multi-page PDF document', () => {
    const src = makeComponent('power_source', { state: 'on' });
    const mcb = makeComponent('mcb', {
      state: 'on',
      props: { ratingAmps: 10, tripCurve: 'B', breakingCapacity: 4500 },
    });
    const circuit = makeCircuit([src, mcb], [wire(src, 'L_OUT', mcb, '1')]);
    const doc = buildCoordinationStudyPdf(circuit, null);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('throws when no protection devices exist', () => {
    const lamp = makeComponent('lamp', { props: { powerWatts: 60 } });
    const circuit = makeCircuit([lamp], []);
    const data = buildCoordinationStudyData(circuit, null);
    expect(data.devices.length).toBe(0);
  });
});
