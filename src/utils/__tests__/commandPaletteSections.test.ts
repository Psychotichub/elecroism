import { describe, expect, it } from 'vitest';
import { acbIncomerBms } from '../../examples/exampleCircuits';
import {
  buildPaletteSections,
  flattenPaletteSections,
  resolveRecentPaletteItems,
} from '../commandPaletteSections';

describe('buildPaletteSections', () => {
  it('shows recent and quick actions when query is empty', () => {
    const circuit = acbIncomerBms();
    const sections = buildPaletteSections(circuit, '', [
      'action-select-unwired',
    ]);
    expect(sections.map((s) => s.id)).toEqual(['recent', 'quick-actions']);
    expect(sections[0].items[0].id).toBe('action-select-unwired');
    expect(
      sections[1].items.some((i) => i.id === 'action-select-unwired')
    ).toBe(false);
  });

  it('groups search hits by kind', () => {
    const circuit = acbIncomerBms();
    const sections = buildPaletteSections(circuit, 'pump', []);
    const labels = sections.map((s) => s.label);
    expect(labels).toContain('Components');
    expect(flattenPaletteSections(sections).length).toBeGreaterThan(0);
  });
});

describe('resolveRecentPaletteItems', () => {
  it('resolves stored component and action ids', () => {
    const circuit = acbIncomerBms();
    const comp = circuit.components[0];
    const items = resolveRecentPaletteItems(
      [`action-select-unwired`, `comp-${comp.id}`],
      circuit
    );
    expect(items).toHaveLength(2);
    expect(items[1].kind).toBe('component');
  });
});
