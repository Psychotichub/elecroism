import { describe, expect, it } from 'vitest';
import { createEmptyCircuit } from '../../store/circuitDefaults';
import { getInspectorSelectionSummary } from '../inspectorSelectionSummary';

describe('getInspectorSelectionSummary', () => {
  it('formats component label and display name', () => {
    const circuit = createEmptyCircuit();
    circuit.components.push({
      id: 'm1',
      type: 'motor',
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      label: 'M1',
      properties: {},
      connectionPoints: [],
    });
    expect(getInspectorSelectionSummary(circuit, 'm1')).toBe('M1 · Motor');
  });

  it('returns undefined when nothing is selected', () => {
    expect(getInspectorSelectionSummary(createEmptyCircuit(), null)).toBeUndefined();
  });
});
