/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PanelSplitter from '../PanelSplitter';

describe('PanelSplitter', () => {
  it('renders a vertical separator with es-panel-splitter styling', () => {
    render(
      <PanelSplitter
        side="left"
        ariaLabel="Resize palette"
        ariaControls="sidebar-palette-root"
        ariaExpanded
        onResize={vi.fn()}
        onDoubleClick={vi.fn()}
        onToggleCollapse={vi.fn()}
      />
    );
    const splitter = screen.getByRole('separator');
    expect(splitter.className).toContain('es-panel-splitter');
    expect(splitter.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('toggles collapse on click without drag', () => {
    const onToggleCollapse = vi.fn();
    render(
      <PanelSplitter
        side="left"
        ariaLabel="Resize palette"
        ariaControls="sidebar-palette-root"
        ariaExpanded
        onResize={vi.fn()}
        onDoubleClick={vi.fn()}
        onToggleCollapse={onToggleCollapse}
      />
    );
    const splitter = screen.getByRole('separator');
    fireEvent.pointerDown(splitter, { clientX: 100, pointerId: 1 });
    fireEvent.pointerUp(splitter, { clientX: 100, pointerId: 1 });
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('resets width on double-click', () => {
    const onDoubleClick = vi.fn();
    render(
      <PanelSplitter
        side="right"
        ariaLabel="Resize inspector"
        ariaControls="inspector-panel-root"
        ariaExpanded={false}
        onResize={vi.fn()}
        onDoubleClick={onDoubleClick}
        onToggleCollapse={vi.fn()}
      />
    );
    fireEvent.doubleClick(screen.getByRole('separator'));
    expect(onDoubleClick).toHaveBeenCalledTimes(1);
  });
});
