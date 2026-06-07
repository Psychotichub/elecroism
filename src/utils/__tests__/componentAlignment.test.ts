import { describe, expect, it } from 'vitest';
import { alignPositions, distributePositions } from '../componentAlignment';

describe('alignPositions', () => {
  const items = [
    { id: 'a', x: 100, y: 200 },
    { id: 'b', x: 300, y: 400 },
    { id: 'c', x: 200, y: 100 },
  ];

  it('aligns left to minimum x', () => {
    const out = alignPositions(items, 'left', 20);
    expect(out.get('a')?.x).toBe(100);
    expect(out.get('b')?.x).toBe(100);
    expect(out.get('c')?.x).toBe(100);
  });

  it('aligns center vertically to mid y (grid-snapped)', () => {
    const out = alignPositions(items, 'centerV', 20);
    // midY = (100 + 400) / 2 = 250 → snapToGrid → 260
    expect(out.get('a')?.y).toBe(260);
    expect(out.get('b')?.y).toBe(260);
    expect(out.get('c')?.y).toBe(260);
  });
});

describe('distributePositions', () => {
  it('spaces centers evenly on x', () => {
    const items = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 100, y: 0 },
      { id: 'c', x: 300, y: 0 },
    ];
    const out = distributePositions(items, 'horizontal', 20);
    expect(out.get('a')?.x).toBe(0);
    expect(out.get('b')?.x).toBe(160);
    expect(out.get('c')?.x).toBe(300);
  });

  it('snap spacing uses grid steps from first item', () => {
    const items = [
      { id: 'a', x: 40, y: 0 },
      { id: 'b', x: 200, y: 0 },
      { id: 'c', x: 400, y: 0 },
    ];
    const out = distributePositions(items, 'spacingH', 20);
    expect(out.get('a')?.x).toBe(40);
    expect(out.get('b')?.x).toBe(60);
    expect(out.get('c')?.x).toBe(80);
  });
});
