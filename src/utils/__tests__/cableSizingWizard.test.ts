import { describe, expect, it } from 'vitest';
import {
  buildWireCableSizingRecord,
  groupingDerating,
  runCableSizingWizard,
  validateCableDerating,
  type CableSizingInput,
} from '../cableSizingWizard';

const baseInput: CableSizingInput = {
  loadKw: 5,
  distanceM: 30,
  voltageV: 230,
  powerFactor: 0.85,
  phaseConfig: 'single_phase',
  installationMethod: 'clipped_direct',
  conductorMaterial: 'copper',
  maxVoltageDropPct: 3,
  ambientTempC: 30,
  circuitsInGroup: 1,
};

describe('runCableSizingWizard derating', () => {
  it('recommends 6 mm² at reference conditions (V-drop limited)', () => {
    const result = runCableSizingWizard(baseInput);
    expect(result.recommended?.crossSectionMm2).toBe(6);
    expect(result.derating.combinedK).toBe(1);
  });

  it('bumps recommendation with high ambient temperature', () => {
    const result = runCableSizingWizard({ ...baseInput, ambientTempC: 55 });
    expect(result.recommended?.crossSectionMm2).toBe(10);
    expect(result.derating.tempK).toBeLessThan(0.7);
  });

  it('bumps recommendation with grouped circuits', () => {
    const result = runCableSizingWizard({ ...baseInput, circuitsInGroup: 6 });
    expect(result.recommended?.crossSectionMm2).toBe(10);
    expect(result.derating.groupingK).toBe(0.65);
  });

  it('applies buried duct method derating', () => {
    const clipped = runCableSizingWizard(baseInput);
    const duct = runCableSizingWizard({
      ...baseInput,
      installationMethod: 'buried_duct',
    });
    expect(duct.derating.methodK).toBe(0.75);
    expect(duct.recommended!.crossSectionMm2).toBeGreaterThanOrEqual(
      clipped.recommended!.crossSectionMm2
    );
  });
});

describe('groupingDerating', () => {
  it('returns IEC-style factors by circuit count', () => {
    expect(groupingDerating(1)).toBe(1);
    expect(groupingDerating(2)).toBe(0.8);
    expect(groupingDerating(6)).toBe(0.65);
    expect(groupingDerating(20)).toBe(0.5);
  });
});

describe('buildWireCableSizingRecord', () => {
  it('captures wizard inputs, derating, and recommendation', () => {
    const input = { ...baseInput, circuitsInGroup: 3 };
    const result = runCableSizingWizard(input);
    const record = buildWireCableSizingRecord(input, result);
    expect(record.loadKw).toBe(5);
    expect(record.circuitsInGroup).toBe(3);
    expect(record.deratingGroupingK).toBe(0.7);
    expect(record.deratingCombinedK).toBe(result.derating.combinedK);
    expect(record.recommendedMm2).toBe(result.recommended?.crossSectionMm2 ?? null);
    expect(record.calculatedAt).toBeTruthy();
  });
});

describe('validateCableDerating', () => {
  it('flags wire below derated ampacity', () => {
    const input = { ...baseInput, ambientTempC: 55 };
    const result = runCableSizingWizard(input);
    const record = buildWireCableSizingRecord(input, result);
    const issues = validateCableDerating({
      wires: [
        {
          id: 'w1',
          crossSection: 4,
          wireLabel: 'L1',
          cableSizing: record,
        },
      ],
    });
    expect(issues.some((i) => i.id === 'cable-derate-w1')).toBe(true);
    expect(issues[0].severity).toBe('warning');
  });
});
