/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isTabletLike } from '../tabletDisplay';

describe('tabletDisplay', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects tablet-like coarse pointer layouts', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches:
        query.includes('pointer: coarse') || query.includes('min-width: 768px'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    vi.stubGlobal('navigator', { maxTouchPoints: 5 });
    expect(isTabletLike()).toBe(true);
  });

  it('returns false for narrow phone layouts', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('pointer: coarse'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    vi.stubGlobal('navigator', { maxTouchPoints: 5 });
    expect(isTabletLike()).toBe(false);
  });
});
