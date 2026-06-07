import { describe, expect, it } from 'vitest';
import {
  ICON_SIZES,
  SEMANTIC_ICON_IDS,
  iconPixelSize,
} from '../icons';

describe('design/icons', () => {
  it('defines standard pixel sizes', () => {
    expect(ICON_SIZES).toEqual({ inline: 14, toolbar: 16, panel: 18 });
    expect(iconPixelSize('toolbar')).toBe(16);
    expect(iconPixelSize(20)).toBe(20);
  });

  it('lists every semantic icon id once', () => {
    const unique = new Set(SEMANTIC_ICON_IDS);
    expect(unique.size).toBe(SEMANTIC_ICON_IDS.length);
    expect(SEMANTIC_ICON_IDS).toContain('simulate');
    expect(SEMANTIC_ICON_IDS).toContain('validation');
    expect(SEMANTIC_ICON_IDS).toContain('learning');
    expect(SEMANTIC_ICON_IDS).toContain('export');
    expect(SEMANTIC_ICON_IDS).toContain('tool-select');
    expect(SEMANTIC_ICON_IDS).toContain('tool-wire');
    expect(SEMANTIC_ICON_IDS).toContain('tool-pan');
  });
});
