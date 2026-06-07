/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import InspectorColumn from '../InspectorColumn';
import PaletteIconRail from '../PaletteIconRail';

describe('light theme panel chrome', () => {
  it('inspector uses es-inspector-root and tablist class', () => {
    render(
      <div data-theme="light">
        <InspectorColumn />
      </div>
    );
    const root = document.getElementById('inspector-panel-root');
    expect(root?.className).toContain('es-inspector-root');
    expect(screen.getByTestId('tabs-root').className).toContain(
      'es-inspector-tablist'
    );
  });

  it('palette icon rail exposes rail test id', () => {
    render(
      <div data-theme="light">
        <PaletteIconRail />
      </div>
    );
    expect(screen.getByTestId('palette-icon-rail').className).toContain(
      'es-palette-rail'
    );
  });
});
