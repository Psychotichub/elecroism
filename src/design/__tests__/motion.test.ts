import { describe, expect, it } from 'vitest';
import { MOTION, MOTION_CLASS, motionClass } from '../motion';

describe('design/motion', () => {
  it('mirrors CSS token durations', () => {
    expect(MOTION).toEqual({ fast: 100, normal: 150, slow: 300 });
  });

  it('exposes motion utility classes with reduced-motion guard', () => {
    expect(MOTION_CLASS.transitionColors).toContain('motion-reduce:transition-none');
    expect(MOTION_CLASS.panelCollapse).toContain('transition-[width]');
    expect(MOTION_CLASS.tabCrossfade).toBe('es-tab-crossfade');
    expect(MOTION_CLASS.simulatePulse).toBe('es-simulate-pulse');
    expect(MOTION_CLASS.badgeBump).toBe('es-badge-bump');
  });

  it('keeps motionClass compatible with transition helpers', () => {
    expect(motionClass()).toBe(MOTION_CLASS.transitionColors);
    expect(motionClass('transition-all')).toBe(MOTION_CLASS.transitionAll);
  });
});
