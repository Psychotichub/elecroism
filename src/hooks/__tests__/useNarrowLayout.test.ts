/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNarrowLayout } from '../useNarrowLayout';
import { NARROW_LAYOUT_MEDIA } from '../../design/breakpoints';

describe('useNarrowLayout', () => {
  let matches = false;
  let changeHandler: (() => void) | undefined;

  afterEach(() => {
    vi.unstubAllGlobals();
    matches = false;
    changeHandler = undefined;
  });

  function stubMatchMedia() {
    vi.stubGlobal('matchMedia', (query: string) => {
      expect(query).toBe(NARROW_LAYOUT_MEDIA);
      return {
        get matches() {
          return matches;
        },
        media: query,
        addEventListener: (_: string, handler: () => void) => {
          changeHandler = handler;
        },
        removeEventListener: vi.fn(),
      };
    });
  }

  it('returns true when the narrow media query matches', () => {
    matches = true;
    stubMatchMedia();
    const { result } = renderHook(() => useNarrowLayout());
    expect(result.current).toBe(true);
  });

  it('updates when the media query changes', () => {
    matches = false;
    stubMatchMedia();
    const { result } = renderHook(() => useNarrowLayout());
    expect(result.current).toBe(false);

    act(() => {
      matches = true;
      changeHandler?.();
    });

    expect(result.current).toBe(true);
  });
});
