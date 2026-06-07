import { describe, expect, it } from 'vitest';
import { buildTerminalScheduleRows } from '../terminalScheduleExport';
import { makeCircuit, makeComponent, wire } from '../../simulation/__tests__/testHelpers';

describe('buildTerminalScheduleRows', () => {
  it('emits in and out rows per wire', () => {
    const src = makeComponent('power_source', { label: 'SRC' });
    const mcb = makeComponent('mcb', { label: 'Q1' });
    const w = wire(src, 'L_OUT', mcb, '1');
    w.wireNumber = 'W1';
    const rows = buildTerminalScheduleRows(makeCircuit([src, mcb], [w]));
    expect(rows).toHaveLength(2);
    expect(rows.some((r) => r.direction === 'out' && r.deviceLabel === 'SRC')).toBe(
      true
    );
    expect(rows.some((r) => r.direction === 'in' && r.deviceLabel === 'Q1')).toBe(
      true
    );
  });
});
