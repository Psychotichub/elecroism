import { describe, expect, it } from 'vitest';
import { dolMotorStarter } from '../../examples/exampleCircuits';
import {
  buildSymbolLegend,
  symbolLegendToCsv,
  symbolLegendToText,
} from '../symbolLegend';

describe('symbolLegend', () => {
  const circuit = dolMotorStarter();

  it('builds legend rows from components on the sheet', () => {
    const rows = buildSymbolLegend(circuit);
    expect(rows.length).toBeGreaterThan(0);
    const mcb = rows.find((r) => r.type === 'mcb');
    expect(mcb?.displayName).toMatch(/MCB/i);
    expect(mcb?.quantity).toBe(1);
    expect(mcb?.tags).toContain('Q1');
    expect(mcb?.ref).toBeGreaterThan(0);
  });

  it('omits connection points from the legend', () => {
    const withCp = {
      ...circuit,
      components: [
        ...circuit.components,
        {
          id: 'cp1',
          type: 'connection_point' as const,
          x: 0,
          y: 0,
          label: '',
          state: 'on' as const,
          properties: {},
          connectionPoints: [],
        },
      ],
    };
    const rows = buildSymbolLegend(withCp);
    expect(rows.some((r) => r.type === 'connection_point')).toBe(false);
  });

  it('exports CSV and plain-text legend sheets', () => {
    const rows = buildSymbolLegend(circuit);
    const csv = symbolLegendToCsv(rows);
    expect(csv).toContain('displayName');
    expect(csv).toMatch(/MCB|Miniature/i);
    const text = symbolLegendToText(rows, 'DOL Motor Starter');
    expect(text).toContain('Symbol legend');
    expect(text).toContain('DOL Motor Starter');
  });
});
