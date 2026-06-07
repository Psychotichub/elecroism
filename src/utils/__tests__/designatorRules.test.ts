import { describe, expect, it } from 'vitest';
import { acbIncomerBms } from '../../examples/exampleCircuits';
import {
  bulkRenumberDesignators,
  findDuplicateDesignators,
  formatDesignatorLabel,
  parseDesignatorLabel,
  sortComponentsSpatial,
} from '../designatorRules';

describe('parseDesignatorLabel', () => {
  it('parses simple tags', () => {
    expect(parseDesignatorLabel('Q1 - Pump')).toEqual({
      location: '',
      function: 'Q',
      number: 1,
      suffix: ' - Pump',
    });
  });

  it('parses IEC 81346 tags', () => {
    expect(parseDesignatorLabel('=MCC1+Q2', 'iec81346')).toEqual({
      location: 'MCC1',
      function: 'Q',
      number: 2,
      suffix: '',
    });
  });
});

describe('formatDesignatorLabel', () => {
  it('formats IEC location+function+number', () => {
    expect(formatDesignatorLabel('iec81346', 'MCC1', 'Q', 3, ' - Fan')).toBe(
      '=MCC1+Q3 - Fan'
    );
  });
});

describe('bulkRenumberDesignators', () => {
  it('renumbers by row order within each function group', () => {
    const circuit = acbIncomerBms();
    circuit.designatorLocation = 'MCC1';
    circuit.designatorScheme = 'simple';
    const mcb1 = circuit.components.find((c) => c.label === 'Q1')!;
    const mcb2 = circuit.components.find((c) => c.label === 'Q2')!;
    mcb1.x = 500;
    mcb2.x = 100;

    const targetIds = new Set([mcb1.id, mcb2.id]);
    const next = bulkRenumberDesignators(circuit, 'row', targetIds);
    const qLeft = next.components.find((c) => c.id === mcb2.id);
    const qRight = next.components.find((c) => c.id === mcb1.id);
    expect(qLeft?.label).toBe('Q1');
    expect(qRight?.label).toBe('Q2');
  });

  it('applies IEC scheme when configured', () => {
    const circuit = acbIncomerBms();
    circuit.designatorScheme = 'iec81346';
    circuit.designatorLocation = 'MCC1';
    const targets = new Set(
      circuit.components.filter((c) => c.label === 'Q1').map((c) => c.id)
    );
    const next = bulkRenumberDesignators(circuit, 'column', targets);
    const q1 = next.components.find((c) => targets.has(c.id));
    expect(q1?.label).toBe('=MCC1+Q1');
  });
});

describe('findDuplicateDesignators', () => {
  it('detects case-insensitive duplicate tags', () => {
    const circuit = acbIncomerBms();
    const mcb2 = circuit.components.find((c) => c.label === 'Q2')!;
    const motor1 = circuit.components.find((c) => c.label.startsWith('M1'))!;
    mcb2.label = 'FEED-A';
    motor1.label = 'feed-a';
    const dups = findDuplicateDesignators(circuit);
    const feedDup = dups.find((d) => d.componentIds.includes(mcb2.id));
    expect(feedDup).toBeTruthy();
    expect(feedDup!.componentIds).toContain(motor1.id);
  });
});

describe('sortComponentsSpatial', () => {
  it('sorts column-major by x then y', () => {
    const circuit = acbIncomerBms();
    const mcbs = circuit.components.filter((c) => c.type === 'three_phase_mcb');
    const sorted = sortComponentsSpatial(mcbs, 'column', circuit.gridSize);
    expect(sorted[0].x).toBeLessThanOrEqual(sorted[1].x);
  });
});
