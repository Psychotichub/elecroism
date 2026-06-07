import { describe, expect, it } from 'vitest';
import {
  NARROW_LAYOUT_MAX_PX,
  NARROW_LAYOUT_MEDIA,
  TABLET_TOUCH_TARGET_MIN_PX,
} from '../breakpoints';

describe('breakpoints', () => {
  it('defines narrow layout at 900px', () => {
    expect(NARROW_LAYOUT_MAX_PX).toBe(900);
    expect(NARROW_LAYOUT_MEDIA).toBe('(max-width: 899px)');
  });

  it('defines tablet touch minimum target size', () => {
    expect(TABLET_TOUCH_TARGET_MIN_PX).toBe(40);
  });
});
