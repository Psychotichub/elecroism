import { describe, expect, it } from 'vitest';
import {
  ELECTRICAL_GLOSSARY,
  getGlossaryEntry,
  glossaryByCategory,
  PROTECTION_COMPARE_IDS,
  searchGlossary,
} from '../electricalGlossary';

describe('electricalGlossary', () => {
  it('includes MCB, MCCB, and MPCB compare entries', () => {
    for (const id of PROTECTION_COMPARE_IDS) {
      expect(getGlossaryEntry(id)?.category).toBe('Protection');
    }
  });

  it('includes IEC and ANSI symbol standard notes', () => {
    expect(getGlossaryEntry('iec-symbols')?.definition).toMatch(/IEC/i);
    expect(getGlossaryEntry('ansi-symbols')?.definition).toMatch(/ANSI/i);
  });

  it('searches by term and category', () => {
    const hits = searchGlossary('contactor');
    expect(hits.some((e) => e.id === 'contactor')).toBe(true);
    expect(glossaryByCategory('Symbol standards').length).toBeGreaterThan(0);
    expect(ELECTRICAL_GLOSSARY.length).toBeGreaterThanOrEqual(10);
  });
});
