import { describe, expect, it } from 'vitest';
import { acbIncomerBms } from '../../examples/exampleCircuits';
import {
  componentIdsWithUnwiredTerminals,
  fuzzyScore,
  searchDrawing,
  selectAllOfTypeQuery,
} from '../drawingSearch';

describe('fuzzyScore', () => {
  it('ranks exact and prefix matches highest', () => {
    expect(fuzzyScore('Q1', 'Q1')).toBeGreaterThan(fuzzyScore('Q1', 'Q2'));
    expect(fuzzyScore('Q', 'Q1')).toBeGreaterThan(fuzzyScore('Q', 'M1'));
  });
});

describe('searchDrawing', () => {
  it('finds components by partial label', () => {
    const circuit = acbIncomerBms();
    const hits = searchDrawing(circuit, 'pump');
    expect(hits.some((h) => h.title.includes('Pump'))).toBe(true);
  });

  it('finds quick actions by keyword', () => {
    const circuit = acbIncomerBms();
    const hits = searchDrawing(circuit, 'unwired');
    expect(hits.some((h) => h.id === 'action-select-unwired')).toBe(true);
  });
});

describe('selectAllOfTypeQuery', () => {
  it('returns all MCB symbols', () => {
    const circuit = acbIncomerBms();
    const ids = selectAllOfTypeQuery(circuit, 'mcb');
    expect(ids).toHaveLength(2);
  });
});

describe('componentIdsWithUnwiredTerminals', () => {
  it('lists devices with open terminals on fresh example', () => {
    const circuit = acbIncomerBms();
    const ids = componentIdsWithUnwiredTerminals(circuit);
    expect(ids.length).toBeGreaterThan(0);
  });
});
