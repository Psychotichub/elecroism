/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UiGallery from '../UiGallery';

describe('UiGallery', () => {
  it('renders shell chrome sections and switches theme', async () => {
    const user = userEvent.setup();
    render(<UiGallery />);

    const root = screen.getByTestId('ui-gallery-root');
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(screen.getByTestId('gallery-menu')).toBeTruthy();
    expect(screen.getByTestId('gallery-toolbar')).toBeTruthy();
    expect(screen.getByTestId('gallery-inspector')).toBeTruthy();
    expect(screen.getByTestId('gallery-dialog')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Light theme' }));
    expect(root.getAttribute('data-theme')).toBe('light');
  });
});
