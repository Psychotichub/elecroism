import { describe, expect, it } from 'vitest';
import {
  CIRCUIT_TEMPLATES,
  getCircuitTemplate,
  listCircuitTemplates,
} from '../circuitTemplates';

describe('circuitTemplates', () => {
  it('lists all built-in starter templates', () => {
    const ids = listCircuitTemplates().map((t) => t.id);
    expect(ids).toEqual([
      'dol-1p',
      'dol-3p',
      'star-delta',
      'vfd-feeder',
      'ats',
    ]);
  });

  it('resolves templates by id', () => {
    expect(getCircuitTemplate('missing')).toBeUndefined();
    expect(getCircuitTemplate('ats')?.name).toBe('ATS Transfer');
  });

  for (const template of CIRCUIT_TEMPLATES) {
    it(`builds "${template.name}" with valid wire endpoints`, () => {
      const { components, wires } = template.build();
      expect(components.length).toBeGreaterThan(0);
      const byId = new Map(components.map((c) => [c.id, c]));

      for (const w of wires) {
        const from = byId.get(w.fromComponentId);
        const to = byId.get(w.toComponentId);
        expect(from, `wire ${w.id} from component`).toBeTruthy();
        expect(to, `wire ${w.id} to component`).toBeTruthy();
        expect(
          from!.connectionPoints.some((p) => p.id === w.fromPointId),
          `wire ${w.id} fromPointId on ${from!.type}`
        ).toBe(true);
        expect(
          to!.connectionPoints.some((p) => p.id === w.toPointId),
          `wire ${w.id} toPointId on ${to!.type}`
        ).toBe(true);
      }
    });
  }
});
