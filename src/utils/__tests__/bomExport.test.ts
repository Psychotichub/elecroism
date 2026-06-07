import { describe, expect, it } from 'vitest';
import { buildBomRows } from '../bomExport';
import { makeCircuit, makeComponent } from '../../simulation/__tests__/testHelpers';

describe('buildBomRows', () => {
  it('groups identical MCBs by rating', () => {
    const q1 = makeComponent('mcb', {
      label: 'Q1',
      props: { ratingAmps: 16, poles: 1 },
    });
    const q2 = makeComponent('mcb', {
      label: 'Q2',
      props: { ratingAmps: 16, poles: 1 },
    });
    const q3 = makeComponent('mcb', {
      label: 'Q3',
      props: { ratingAmps: 32, poles: 1 },
    });
    const rows = buildBomRows(makeCircuit([q1, q2, q3], []));
    const mcb16 = rows.find((r) => r.count === '2' && r.ratings.includes('16'));
    expect(mcb16).toBeDefined();
    expect(rows.find((r) => r.ratings.includes('32'))?.count).toBe('1');
  });
});
