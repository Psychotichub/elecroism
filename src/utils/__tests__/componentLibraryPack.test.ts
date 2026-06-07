import { describe, expect, it } from 'vitest';
import {
  buildLibraryPack,
  mergeMacroLibraries,
  parseLibraryPack,
} from '../componentLibraryPack';
import type { ComponentMacro } from '../componentMacros';

function sampleMacro(name: string, id = name.toLowerCase()): ComponentMacro {
  return {
    id,
    name,
    createdAt: '2026-01-01T00:00:00.000Z',
    components: [
      {
        id: `c-${id}`,
        type: 'mcb',
        label: 'Q1',
        x: 0,
        y: 0,
        rotation: 0,
        state: 'off',
        selected: false,
        connectionPoints: [
          {
            id: 'p1',
            componentId: `c-${id}`,
            label: '1',
            x: -20,
            y: 0,
          },
          {
            id: 'p2',
            componentId: `c-${id}`,
            label: '2',
            x: 20,
            y: 0,
          },
        ],
        properties: { ratingAmps: 16, phaseSystem: 'single_phase' },
      },
    ],
    wires: [],
  };
}

describe('componentLibraryPack', () => {
  it('builds and parses library packs', () => {
    const pack = buildLibraryPack([sampleMacro('DOL')], 'Starter Pack');
    const parsed = parseLibraryPack(pack);
    expect(parsed?.name).toBe('Starter Pack');
    expect(parsed?.macros).toHaveLength(1);
    expect(parsed?.macros[0].name).toBe('DOL');
  });

  it('merges libraries without duplicate names', () => {
    const existing = [sampleMacro('DOL')];
    const imported = [sampleMacro('DOL', 'dol-2'), sampleMacro('ATS', 'ats-1')];
    const merged = mergeMacroLibraries(existing, imported, 'merge');
    expect(merged).toHaveLength(2);
    expect(merged.map((m) => m.name).sort()).toEqual(['ATS', 'DOL']);
  });

  it('replaces library on replace mode', () => {
    const existing = [sampleMacro('Old')];
    const imported = [sampleMacro('New')];
    const merged = mergeMacroLibraries(existing, imported, 'replace');
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe('New');
  });
});
