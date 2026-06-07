import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import {
  buildSymbolLegend,
  type SymbolLegendRow,
} from '../symbolLegend';
import { drawSymbolLegendPdf } from '../symbolLegendPdf';
import { makeCircuit, makeComponent } from '../../simulation/__tests__/testHelpers';

describe('symbolLegend PDF', () => {
  it('renders a legend page without error', () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const rows: SymbolLegendRow[] = [
      {
        ref: 1,
        type: 'mcb',
        displayName: 'MCB',
        quantity: 2,
        tags: 'Q1, Q2',
        description: 'Miniature circuit breaker.',
      },
    ];
    expect(() => drawSymbolLegendPdf(doc, rows, 'Test drawing')).not.toThrow();
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('builds legend rows from circuit components', () => {
    const circuit = makeCircuit(
      [makeComponent('mcb', { label: 'Q1' }), makeComponent('socket')],
      []
    );
    const rows = buildSymbolLegend(circuit);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.some((r) => r.type === 'mcb')).toBe(true);
  });
});
