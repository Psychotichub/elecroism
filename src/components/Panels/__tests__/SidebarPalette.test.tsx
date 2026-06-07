/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Sidebar from '../Sidebar';
import { useUiStore } from '../../../store/uiStore';
import {
  loadFavoriteTypes,
  saveFavoriteTypes,
} from '../../../utils/sidebarPaletteStorage';
import { ALL_PALETTE_TYPES } from '../palette/paletteGroups';

describe('Sidebar palette polish', () => {
  beforeEach(() => {
    useUiStore.setState({ paletteCategoryFilter: null });
    window.localStorage.clear();
    saveFavoriteTypes(['mcb', 'contactor'], ALL_PALETTE_TYPES);
  });

  it('renders category filter chips and a distinct favorites section', () => {
    render(<Sidebar />);
    expect(screen.getByTestId('palette-category-chips')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'All' })).toBeTruthy();
    expect(screen.getByTestId('palette-section-Favorites')).toBeTruthy();
    expect(screen.getByTestId('palette-section-Favorites').className).toContain(
      'es-palette-favorites-section'
    );
  });

  it('renders 32px palette rows with symbol thumbnails', () => {
    render(<Sidebar />);
    const row = screen.getByTestId('palette-row-Favorites-mcb');
    expect(row.className).toContain('es-palette-row');
    expect(row.querySelector('.es-palette-symbol-thumb')).toBeTruthy();
  });

  it('highlights search matches in row labels', () => {
    render(<Sidebar />);
    fireEvent.change(screen.getByPlaceholderText('Search… (/)'), {
      target: { value: 'MCB' },
    });
    const row = screen.getByTestId('palette-row-Favorites-mcb');
    const mark = row.querySelector('mark.es-palette-search-hit');
    expect(mark?.textContent).toBe('MCB');
  });

  it('focuses search when / is pressed', async () => {
    render(<Sidebar />);
    const input = screen.getByPlaceholderText('Search… (/)');
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: '/', bubbles: true })
    );
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it('uses sticky section headers with es-typo-label', () => {
    render(<Sidebar />);
    const favHeader = screen
      .getByTestId('palette-section-Favorites')
      .querySelector('.es-palette-section-header');
    expect(favHeader).toBeTruthy();
    expect(favHeader?.querySelector('.es-typo-label')).toBeTruthy();
  });

  it('restores favorites from storage', () => {
    const favs = loadFavoriteTypes(ALL_PALETTE_TYPES);
    expect(favs).toContain('mcb');
    expect(favs).toContain('contactor');
  });
});
