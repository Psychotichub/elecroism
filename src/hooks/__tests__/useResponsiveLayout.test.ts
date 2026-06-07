/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponsiveLayout } from '../useResponsiveLayout';
import { useUiStore } from '../../store/uiStore';
import { NARROW_LAYOUT_MEDIA } from '../../design/breakpoints';

describe('useResponsiveLayout', () => {
  let narrow = false;
  let narrowChange: (() => void) | undefined;

  beforeEach(() => {
    narrow = false;
    narrowChange = undefined;
    useUiStore.setState({ sidebarCollapsed: false });
    vi.stubGlobal('matchMedia', (query: string) => {
      if (query === NARROW_LAYOUT_MEDIA) {
        return {
          get matches() {
            return narrow;
          },
          media: query,
          addEventListener: (_: string, handler: () => void) => {
            narrowChange = handler;
          },
          removeEventListener: vi.fn(),
        };
      }
      return {
        matches:
          query.includes('pointer: coarse') || query.includes('min-width: 768px'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    });
    vi.stubGlobal('navigator', { maxTouchPoints: 0 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('auto-collapses the palette when entering narrow layout', () => {
    renderHook(() => useResponsiveLayout());
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);

    act(() => {
      narrow = true;
      narrowChange?.();
    });

    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  it('auto-collapses the palette on mount when already narrow', () => {
    narrow = true;
    renderHook(() => useResponsiveLayout());
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  it('does not collapse an already-collapsed palette on narrow entry', () => {
    useUiStore.setState({ sidebarCollapsed: true });
    narrow = true;

    renderHook(() => useResponsiveLayout());

    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  it('exposes tablet touch when coarse pointer layout is detected', () => {
    vi.stubGlobal('navigator', { maxTouchPoints: 5 });
    const { result } = renderHook(() => useResponsiveLayout());
    expect(result.current.tabletTouch).toBe(true);
  });
});
