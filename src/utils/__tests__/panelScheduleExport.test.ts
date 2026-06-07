import { describe, expect, it } from 'vitest';
import { makeCircuit, makeComponent, wire } from '../../simulation/__tests__/testHelpers';
import {
  buildPanelSchedulePdf,
  buildPanelScheduleRows,
  panelScheduleToCsv,
} from '../panelScheduleExport';

describe('panelScheduleExport', () => {
  it('orders devices left-to-right by canvas position', () => {
    const q1 = makeComponent('mcb', {
      label: 'Q1',
      x: 200,
      props: { ratingAmps: 32 },
    });
    const q2 = makeComponent('mcb', {
      label: 'Q2',
      x: 100,
      props: { ratingAmps: 16 },
    });
    const circuit = makeCircuit([q1, q2], []);
    const rows = buildPanelScheduleRows(circuit);
    expect(rows.map((r) => r.tag)).toEqual(['Q2', 'Q1']);
    expect(rows[0].position).toBe('1');
    expect(rows[1].position).toBe('2');
  });

  it('includes cable refs from connected wires', () => {
    const src = makeComponent('power_source', { state: 'on', label: 'G1' });
    const mcb = makeComponent('mcb', {
      label: 'Q1',
      state: 'on',
      props: { ratingAmps: 16 },
    });
    const w = wire(src, 'L_OUT', mcb, '1');
    w.wireNumber = 'W12';
    w.crossSection = 2.5;
    const circuit = makeCircuit([src, mcb], [w]);
    const rows = buildPanelScheduleRows(circuit);
    expect(rows).toHaveLength(1);
    expect(rows[0].cableRef).toBe('W12');
    expect(rows[0].rating).toContain('16 A');
  });

  it('excludes junctions and passive infrastructure', () => {
    const q1 = makeComponent('mcb', { label: 'Q1' });
    const j1 = makeComponent('junction', { label: 'J1' });
    const rows = buildPanelScheduleRows(makeCircuit([q1, j1], []));
    expect(rows).toHaveLength(1);
    expect(rows[0].tag).toBe('Q1');
  });

  it('exports CSV with header row', () => {
    const csv = panelScheduleToCsv(
      makeCircuit([makeComponent('mccb', { label: 'Q0' })], [])
    );
    expect(csv).toContain('Pos,Tag,Type,Rating,Cable ref,Notes');
    expect(csv).toContain('Q0');
  });

  it('builds a printable PDF document', () => {
    const doc = buildPanelSchedulePdf(
      makeCircuit([makeComponent('contactor', { label: 'K1' })], []),
      { name: 'Site A', titleBlock: { client: 'Site A' } }
    );
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
