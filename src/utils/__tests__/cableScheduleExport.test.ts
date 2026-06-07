import { describe, expect, it } from 'vitest';
import { buildCableScheduleRows } from '../cableScheduleExport';
import { makeCircuit, makeComponent } from '../../simulation/__tests__/testHelpers';
import type { Wire } from '../../types';

describe('cableScheduleExport', () => {
  it('includes wizard fields for wires with persisted sizing', () => {
    const q1 = makeComponent('mcb', { label: 'Q1' });
    const m1 = makeComponent('motor', { label: 'M1', x: 200 });
    const wire: Wire = {
      id: 'w1',
      fromComponentId: q1.id,
      fromPointId: q1.connectionPoints[0].id,
      toComponentId: m1.id,
      toPointId: m1.connectionPoints[0].id,
      points: [0, 0, 200, 0],
      color: 'brown',
      crossSection: 2.5,
      wireNumber: 'W1',
      energized: false,
      currentAmps: 0,
      cableSizing: {
        loadKw: 5,
        distanceM: 30,
        voltageV: 230,
        powerFactor: 0.85,
        phaseConfig: 'single_phase',
        installationMethod: 'clipped_direct',
        conductorMaterial: 'copper',
        maxVoltageDropPct: 3,
        ambientTempC: 30,
        recommendedMm2: 4,
        loadCurrentA: 25.5,
        deratedAmpacityA: 28,
        voltageDropV: 5.2,
        voltageDropPct: 2.3,
        summary: 'Recommended cable: 4 mm²',
        calculatedAt: '2026-06-07T12:00:00.000Z',
      },
    };
    const rows = buildCableScheduleRows(makeCircuit([q1, m1], [wire]));
    expect(rows).toHaveLength(1);
    expect(rows[0].hasWizardData).toBe('yes');
    expect(rows[0].recommendedMm2).toBe('4');
    expect(rows[0].loadCurrentA).toBe('25.5');
    expect(rows[0].fromComponent).toContain('Q1');
  });

  it('marks wires without wizard data', () => {
    const q1 = makeComponent('mcb', { label: 'Q1' });
    const wire: Wire = {
      id: 'w1',
      fromComponentId: q1.id,
      fromPointId: q1.connectionPoints[0].id,
      toComponentId: q1.id,
      toPointId: q1.connectionPoints[1]?.id ?? q1.connectionPoints[0].id,
      points: [0, 0, 50, 0],
      color: 'brown',
      crossSection: 1.5,
      energized: false,
      currentAmps: 0,
    };
    const rows = buildCableScheduleRows(makeCircuit([q1], [wire]));
    expect(rows[0].hasWizardData).toBe('no');
    expect(rows[0].recommendedMm2).toBe('');
  });
});
