/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from '../../../store/uiStore';
import CommandPalette from '../CommandPalette';

describe('CommandPalette', () => {
  beforeEach(() => {
    useUiStore.setState({
      commandPaletteOpen: true,
      commandPaletteSession: 1,
    });
    window.localStorage.removeItem('electroism.commandPaletteRecent.v1');
  });

  it('renders quick action sections when opened', () => {
    render(<CommandPalette />);
    expect(screen.getByTestId('palette-section-quick-actions')).toBeInTheDocument();
    expect(screen.getByText('Quick actions')).toBeInTheDocument();
    expect(screen.getByTestId('palette-row-action-select-unwired')).toBeInTheDocument();
  });

  it('shows grouped search results', () => {
    render(<CommandPalette />);
    fireEvent.change(screen.getByLabelText('Command palette search'), {
      target: { value: 'unwired' },
    });
    expect(screen.getByTestId('palette-section-action')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });
});
