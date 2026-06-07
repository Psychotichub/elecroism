import { describe, expect, it } from 'vitest';
import { getCanvasTokens } from '../tokens';

describe('high-contrast semantics', () => {
  it('keeps fault red distinct from yellow accent and orange warning', () => {
    const hc = getCanvasTokens('high-contrast');
    expect(hc.accent).toBe('#ffff00');
    expect(hc.warning).toBe('#ffaa00');
    expect(hc.error).toBe('#ff4444');
    expect(hc.warning).not.toBe(hc.accent);
    expect(hc.error).not.toBe(hc.accent);
    expect(hc.error).not.toBe(hc.warning);
  });
});
