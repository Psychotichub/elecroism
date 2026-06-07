/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Toolbar from '../Toolbar';
import { useShortcutStore } from '../../../store/shortcutStore';

describe('Toolbar', () => {
  beforeEach(() => {
    useShortcutStore.getState().resetToolbarSlots();
  });

  it('does not render a theme cycle control (moved to View → Appearance)', () => {
    render(<Toolbar />);
    expect(screen.queryByRole('button', { name: /theme/i })).toBeNull();
  });

  it('does not duplicate drawing tools from customizable slots', () => {
    useShortcutStore.getState().setToolbarSlot(0, 'tool-select');
    render(<Toolbar />);
    const selectButtons = screen.getAllByRole('button', { name: /select/i });
    expect(selectButtons).toHaveLength(1);
  });
});
