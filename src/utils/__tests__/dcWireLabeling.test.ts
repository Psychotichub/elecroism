import { describe, expect, it } from 'vitest';
import {
  classifyDcWirePolarity,
  dcWireExportColorLabel,
  recommendedDcWireColor,
  buildDcWireExportFields,
} from '../dcWireLabeling';
import type { Wire } from '../../types';

describe('dcWireLabeling', () => {
  it('classifies BAT_POS as DC positive', () => {
    expect(classifyDcWirePolarity('BAT_POS', 'BAT_POS')).toBe('dc_plus');
    expect(recommendedDcWireColor('BAT_POS', 'T1')).toBe('red');
  });

  it('classifies PWR_0V as DC return', () => {
    expect(classifyDcWirePolarity('PWR_24V', 'PWR_0V')).toBe('dc_plus');
    expect(classifyDcWirePolarity('DI_1', 'PWR_0V')).toBe('dc_minus');
  });

  it('exports colour labels for wire schedules', () => {
    expect(dcWireExportColorLabel('red')).toContain('RD');
    expect(dcWireExportColorLabel('black')).toContain('BK');
  });

  it('flags non-standard DC wire colours', () => {
    const w: Wire = {
      id: 'w1',
      fromComponentId: 'a',
      fromPointId: 'p1',
      toComponentId: 'b',
      toPointId: 'p2',
      points: [0, 0, 10, 0],
      color: 'brown',
      crossSection: 1.5,
      energized: false,
      currentAmps: 0,
    };
    const fields = buildDcWireExportFields(w, 'DC_PLUS', 'T1');
    expect(fields.dcPolarity).toBe('+');
    expect(fields.dcColorOk).toBe('check');
  });
});
