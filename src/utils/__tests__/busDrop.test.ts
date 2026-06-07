import { describe, expect, it } from 'vitest';
import { acbIncomerBms } from '../../examples/exampleCircuits';
import {
  collectFeederBranch,
  duplicateIdenticalFeeder,
  findPhaseBusbarGroup,
  findTemplateBreakerOnGroup,
  incrementDesignator,
  nextFreeTapIndex,
} from '../busDrop';

describe('busDrop helpers', () => {
  it('increments designators', () => {
    expect(incrementDesignator('Q1')).toBe('Q2');
    expect(incrementDesignator('M1 - Pump')).toBe('M2 - Pump');
  });

  it('finds phase busbar group in ACB example', () => {
    const circuit = acbIncomerBms();
    const busL1 = circuit.components.find((c) => c.label === 'L1 Bus')!;
    const group = findPhaseBusbarGroup(circuit, busL1.id);
    expect(group).toHaveLength(3);
    expect(group.map((b) => b.label).sort()).toEqual([
      'L1 Bus',
      'L2 Bus',
      'L3 Bus',
    ]);
  });

  it('collects breaker→load branch', () => {
    const circuit = acbIncomerBms();
    const mcb1 = circuit.components.find((c) => c.label === 'Q1')!;
    const branch = collectFeederBranch(circuit, mcb1.id);
    expect(branch).not.toBeNull();
    expect(branch!.componentIds.size).toBe(2);
    expect([...branch!.componentIds]).toContain(mcb1.id);
    const motor1 = circuit.components.find((c) => c.label.startsWith('M1'))!;
    expect(branch!.componentIds.has(motor1.id)).toBe(true);
  });

  it('next free tap follows highest used tap', () => {
    const circuit = acbIncomerBms();
    const busL1 = circuit.components.find((c) => c.label === 'L1 Bus')!;
    const group = findPhaseBusbarGroup(circuit, busL1.id);
    expect(nextFreeTapIndex(circuit, group)).toBe(5);
  });
});

describe('duplicateIdenticalFeeder', () => {
  it('duplicates Q1 feeder to next tap with incremented labels', () => {
    const circuit = acbIncomerBms();
    const mcb1 = circuit.components.find((c) => c.label === 'Q1')!;
    const beforeIds = new Set(circuit.components.map((c) => c.id));
    const result = duplicateIdenticalFeeder(circuit, {
      templateBreakerId: mcb1.id,
    });
    expect(result).not.toBeNull();
    expect(result!.newBreakerId).toBeTruthy();
    const added = result!.circuit.components.filter(
      (c) => !beforeIds.has(c.id)
    );
    expect(added).toHaveLength(2);
    const newBreaker = result!.circuit.components.find(
      (c) => c.id === result!.newBreakerId
    );
    expect(newBreaker?.label).toBe('Q3');
    const newMotor = added.find((c) => c.type === 'three_phase_motor');
    expect(newMotor?.label).toBe('M2 - Pump');
    const busFeeds = result!.circuit.wires.filter(
      (w) => w.toComponentId === result!.newBreakerId
    );
    expect(busFeeds.length).toBe(3);
    busFeeds.forEach((w) => {
      expect(w.wireNumberAuto).toBe(true);
      expect(w.points.length).toBeGreaterThanOrEqual(4);
    });
  });

  it('finds template breaker adjacent to seed tap', () => {
    const circuit = acbIncomerBms();
    const busL1 = circuit.components.find((c) => c.label === 'L1 Bus')!;
    const group = findPhaseBusbarGroup(circuit, busL1.id);
    const mcb2 = circuit.components.find((c) => c.label === 'Q2')!;
    const template = findTemplateBreakerOnGroup(circuit, group, 5);
    expect(template).toBe(mcb2.id);
  });
});
