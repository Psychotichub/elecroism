/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CanvasZoomControls from '../CanvasZoomControls';

describe('CanvasZoomControls', () => {
  it('renders bottom-left zoom toolbar with token class', () => {
    render(
      <CanvasZoomControls
        zoom={1.25}
        toolLabel="Select"
        sldViewMode={false}
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onResetView={vi.fn()}
      />
    );

    const toolbar = screen.getByTestId('canvas-zoom-controls');
    expect(toolbar.className).toContain('es-canvas-zoom-controls');
    expect(screen.getByText('Select · 125%')).toBeInTheDocument();
  });

  it('invokes zoom handlers', () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    const onResetView = vi.fn();

    render(
      <CanvasZoomControls
        zoom={1}
        toolLabel="Wire"
        sldViewMode
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetView={onResetView}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset zoom and pan' }));

    expect(onZoomIn).toHaveBeenCalledOnce();
    expect(onZoomOut).toHaveBeenCalledOnce();
    expect(onResetView).toHaveBeenCalledOnce();
    expect(screen.getByText('Wire · SLD · 100%')).toBeInTheDocument();
  });
});
