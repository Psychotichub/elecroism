/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Tooltip, { TOOLTIP_SHOW_DELAY_MS } from '../Tooltip';

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows after hover delay and hides on mouse leave', () => {
    render(
      <Tooltip content="Select tool">
        <button type="button">Trigger</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Trigger' });
    fireEvent.mouseEnter(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(TOOLTIP_SHOW_DELAY_MS);
    });
    expect(screen.getByRole('tooltip')).toHaveTextContent('Select tool');

    fireEvent.mouseLeave(trigger);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows on keyboard focus', () => {
    render(
      <Tooltip content="Shortcuts">
        <button type="button">Settings</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Settings' });
    fireEvent.focus(trigger);
    act(() => {
      vi.advanceTimersByTime(TOOLTIP_SHOW_DELAY_MS);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-describedby');
  });

  it('strips native title attributes from the trigger', () => {
    render(
      <Tooltip content="Hint">
        <button type="button" title="Native title">
          Trigger
        </button>
      </Tooltip>
    );

    expect(screen.getByRole('button', { name: 'Trigger' })).not.toHaveAttribute(
      'title'
    );
  });
});
