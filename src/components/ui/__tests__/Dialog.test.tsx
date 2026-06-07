/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Dialog from '../Dialog';

describe('Dialog', () => {
  it('renders header, body, and footer when open', () => {
    render(
      <Dialog
        open
        title="Test dialog"
        onClose={vi.fn()}
        footer={<button type="button">Save</button>}
      >
        <p>Body content</p>
      </Dialog>
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Test dialog')).toBeTruthy();
    expect(screen.getByText('Body content')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('calls onClose from the close button', () => {
    const onClose = vi.fn();
    render(
      <Dialog open title="Closable" onClose={onClose}>
        <p>Content</p>
      </Dialog>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('supports headerless command palette shell', () => {
    render(
      <Dialog
        open
        title="Command palette"
        ariaLabel="Command palette"
        showHeader={false}
        align="top"
        onClose={vi.fn()}
      >
        <input aria-label="Command palette search" />
      </Dialog>
    );
    expect(screen.getByLabelText('Command palette search')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Close dialog' })).toBeNull();
  });
});
