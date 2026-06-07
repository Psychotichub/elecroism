import { describe, expect, it } from 'vitest';
import {
  inferComponentDrawingLayer,
  inferWireDrawingLayer,
  resolveComponentDrawingLayer,
} from '../drawingLayers';
import type { CircuitComponent, Wire } from '../../types';

describe('drawingLayers', () => {
  it('classifies control and instrumentation components', () => {
    expect(inferComponentDrawingLayer('push_button')).toBe('control');
    expect(inferComponentDrawingLayer('energy_meter')).toBe('instrumentation');
    expect(inferComponentDrawingLayer('mcb')).toBe('power');
  });

  it('infers wire layers from style presets', () => {
    const controlWire = {
      styleLayer: 'control_dc',
    } as Wire;
    expect(inferWireDrawingLayer(controlWire)).toBe('control');

    const commWire = {
      styleLayer: 'communication',
    } as Wire;
    expect(inferWireDrawingLayer(commWire)).toBe('instrumentation');
  });

  it('uses explicit component assignment when set', () => {
    const comp = {
      type: 'mcb',
      drawingLayer: 'control',
    } as CircuitComponent;
    expect(resolveComponentDrawingLayer(comp)).toBe('control');
  });
});
