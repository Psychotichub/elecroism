import { describe, expect, it } from 'vitest';
import { makeComponent } from '../../simulation/__tests__/testHelpers';
import {
  shouldRenderSldComponent,
  sldBlockStyle,
  sldTypeAbbreviation,
  sldWireSegment,
} from '../sldView';

describe('sldView', () => {
  it('collapses wire polyline to endpoints', () => {
    const segment = sldWireSegment({
      id: 'w1',
      fromComponentId: 'a',
      fromPointId: 'p1',
      toComponentId: 'b',
      toPointId: 'p2',
      points: [0, 0, 40, 0, 40, 60, 100, 60],
      color: 'black',
      crossSection: 2.5,
      energized: false,
      currentAmps: 0,
    });
    expect(segment).toEqual([0, 0, 100, 60]);
  });

  it('uses busbar style for busbars', () => {
    const style = sldBlockStyle(makeComponent('busbar', { label: 'BUS' }));
    expect(style.kind).toBe('busbar');
  });

  it('skips documentation-only infrastructure', () => {
    expect(shouldRenderSldComponent(makeComponent('din_rail'))).toBe(false);
    expect(shouldRenderSldComponent(makeComponent('mcb', { label: 'Q1' }))).toBe(
      true
    );
  });

  it('abbreviates common device types', () => {
    expect(sldTypeAbbreviation('mccb')).toBe('MCCB');
    expect(sldTypeAbbreviation('three_phase_motor')).toBe('M');
  });
});
