/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ValidationIssueRow from '../ValidationIssueRow';

describe('ValidationIssueRow', () => {
  it('renders severity stripe, message, and focus action', () => {
    const onFocus = vi.fn();
    render(
      <ValidationIssueRow
        severity="error"
        message="MCB undersized for load"
        focusLabel="Focus M1"
        onFocus={onFocus}
      />
    );
    const row = screen.getByTestId('validation-issue-row');
    expect(row.className).toContain('es-validation-issue-error');
    expect(screen.getByText('MCB undersized for load')).toBeTruthy();
    expect(screen.getByText('Focus M1')).toBeTruthy();
    fireEvent.click(row);
    expect(onFocus).toHaveBeenCalledOnce();
  });

  it('disables focus when not actionable', () => {
    render(
      <ValidationIssueRow
        severity="warning"
        message="Check wiring"
        disabled
      />
    );
    expect(screen.getByTestId('validation-issue-row')).toBeDisabled();
  });
});
