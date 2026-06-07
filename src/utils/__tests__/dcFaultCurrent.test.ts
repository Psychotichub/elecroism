import { describe, expect, it } from 'vitest';
import {
  batteryInternalResistanceOhms,
  boltedDcFaultCurrentA,
  buildDcFaultReport,
  maxDcFaultCurrentA,
} from '../dcFaultCurrent';
import { makeComponent, makeCircuit } from '../../simulation/__tests__/testHelpers';

describe('dcFaultCurrent', () => {
  it('estimates lower R_int for larger battery packs', () => {
    const small = makeComponent('dc_battery_backup', {
      props: { batteryCapacityAh: 4 },
    });
    const large = makeComponent('dc_battery_backup', {
      props: { batteryCapacityAh: 40 },
    });
    expect(batteryInternalResistanceOhms(large)).toBeLessThan(
      batteryInternalResistanceOhms(small)
    );
  });

  it('computes bolted fault current from voltage and R_int', () => {
    const bat = makeComponent('dc_battery_backup', {
      state: 'on',
      props: { voltage: 24, batteryCapacityAh: 7 },
    });
    const i = boltedDcFaultCurrentA(bat);
    expect(i).toBeGreaterThan(50);
    expect(i).toBeLessThan(5000);
  });

  it('builds fault report for DC sources', () => {
    const bat = makeComponent('dc_battery_backup', {
      state: 'on',
      props: { voltage: 48, batteryCapacityAh: 12 },
    });
    const rows = buildDcFaultReport(makeCircuit([bat], []));
    expect(rows).toHaveLength(1);
    expect(rows[0].voltageV).toBe(48);
    expect(rows[0].boltedFaultCurrentA).toBeGreaterThan(0);
  });

  it('tracks max DC fault across sources', () => {
    const dc = makeComponent('dc_power_source', {
      state: 'on',
      props: { voltage: 24 },
    });
    const max = maxDcFaultCurrentA(makeCircuit([dc], []));
    expect(max).toBeGreaterThan(100);
  });
});
