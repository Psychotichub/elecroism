import { describe, expect, it } from 'vitest';
import { clampPanelWidth, PANEL_DEFAULT_WIDTH } from '../panelLayout';

describe('panelLayout', () => {
  it('clamps sidebar width within limits', () => {
    expect(clampPanelWidth(100, 'sidebar')).toBe(180);
    expect(clampPanelWidth(500, 'sidebar')).toBe(400);
    expect(clampPanelWidth(224, 'sidebar')).toBe(224);
  });

  it('exposes default widths for double-click reset', () => {
    expect(PANEL_DEFAULT_WIDTH.sidebar).toBe(224);
    expect(PANEL_DEFAULT_WIDTH.inspector).toBe(320);
  });
});
