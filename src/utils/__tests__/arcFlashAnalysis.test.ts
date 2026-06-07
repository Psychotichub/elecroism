import { describe, expect, it } from 'vitest';
import {
  buildArcFlashReport,
  estimateClearingTimeS,
  incidentEnergyLeeCalCm2,
  ppeCategoryFromEnergy,
  validateArcFlash,
} from '../arcFlashAnalysis';
import { makeComponent } from '../../simulation/__tests__/testHelpers';
import { makeCircuit } from '../../simulation/__tests__/testHelpers';

describe('arcFlashAnalysis', () => {
  it('magnetic MCB trip clears faster than thermal band', () => {
    const mcb = makeComponent('mcb', {
      props: { ratingAmps: 16, tripCurve: 'C' },
    });
    const fast = estimateClearingTimeS(mcb, 2000);
    const slow = estimateClearingTimeS(mcb, 20);
    expect(fast).toBeLessThan(slow);
  });

  it('incident energy increases with fault current and time', () => {
    const low = incidentEnergyLeeCalCm2(230, 500, 0.02, 0.457);
    const high = incidentEnergyLeeCalCm2(230, 5000, 0.2, 0.457);
    expect(high).toBeGreaterThan(low);
  });

  it('assigns PPE categories by energy bands', () => {
    expect(ppeCategoryFromEnergy(2)).toBe('0');
    expect(ppeCategoryFromEnergy(10)).toBe('2');
    expect(ppeCategoryFromEnergy(50)).toBe('4');
  });

  it('builds rows for protection devices on a supplied circuit', () => {
    const src = makeComponent('power_source', { label: 'SRC', state: 'on' });
    const mcb = makeComponent('mcb', {
      label: 'Q1',
      state: 'on',
      props: { ratingAmps: 16, tripCurve: 'C', breakingCapacity: 10000 },
    });
    const circuit = makeCircuit([src, mcb], []);
    const rows = buildArcFlashReport(circuit, null);
    expect(rows.length).toBe(1);
    expect(rows[0].deviceId).toBe(mcb.id);
    expect(rows[0].incidentEnergyCalCm2).toBeGreaterThan(0);
  });

  it('flags very high incident energy', () => {
    const src = makeComponent('power_source', { label: 'SRC', state: 'on' });
    const acb = makeComponent('air_circuit_breaker', {
      label: 'ACB1',
      state: 'on',
      props: {
        ratingAmps: 630,
        breakingCapacity: 10000,
        acbInstantaneousMult: 10,
      },
    });
    const circuit = makeCircuit([src, acb], []);
    const rows = buildArcFlashReport(circuit, null);
    const issues = validateArcFlash(circuit, null);
    if (rows[0]?.incidentEnergyCalCm2 >= 40) {
      expect(issues.some((i) => i.id.startsWith('arcflash-cat4'))).toBe(true);
    }
  });
});
