/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PaletteIconRail from '../PaletteIconRail';
import { useUiStore } from '../../../store/uiStore';
import { PALETTE_GROUP_META } from '../paletteGroupMeta';

describe('PaletteIconRail', () => {
  beforeEach(() => {
    useUiStore.setState({
      sidebarCollapsed: true,
      paletteCategoryFilter: null,
    });
  });

  it('renders a category button per palette group', () => {
    render(<PaletteIconRail />);
    expect(screen.getByTestId('palette-icon-rail')).toBeTruthy();
    for (const group of PALETTE_GROUP_META) {
      expect(screen.getByRole('button', { name: group.name })).toBeTruthy();
    }
  });

  it('expands the palette and focuses the clicked category', () => {
    render(<PaletteIconRail />);
    fireEvent.click(screen.getByRole('button', { name: 'Protection' }));
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
    expect(useUiStore.getState().paletteCategoryFilter).toBe('Protection');
  });
});
