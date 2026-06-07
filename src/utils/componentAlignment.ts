import { snapToGrid } from './geometry';

export type AlignMode =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'centerH'
  | 'centerV';

export type DistributeMode =
  | 'horizontal'
  | 'vertical'
  | 'spacingH'
  | 'spacingV';

export type AlignableComponent = {
  id: string;
  x: number;
  y: number;
};

export function alignPositions(
  items: AlignableComponent[],
  mode: AlignMode,
  gridSize: number
): Map<string, { x: number; y: number }> {
  if (items.length < 2) return new Map();

  const xs = items.map((i) => i.x);
  const ys = items.map((i) => i.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  const out = new Map<string, { x: number; y: number }>();
  for (const item of items) {
    let x = item.x;
    let y = item.y;
    switch (mode) {
      case 'left':
        x = minX;
        break;
      case 'right':
        x = maxX;
        break;
      case 'top':
        y = minY;
        break;
      case 'bottom':
        y = maxY;
        break;
      case 'centerH':
        x = midX;
        break;
      case 'centerV':
        y = midY;
        break;
    }
    out.set(item.id, {
      x: snapToGrid(x, gridSize),
      y: snapToGrid(y, gridSize),
    });
  }
  return out;
}

export function distributePositions(
  items: AlignableComponent[],
  mode: DistributeMode,
  gridSize: number
): Map<string, { x: number; y: number }> {
  if (items.length < 3) return new Map();

  const horizontal = mode === 'horizontal' || mode === 'spacingH';
  const sorted = [...items].sort((a, b) =>
    horizontal ? a.x - b.x : a.y - b.y
  );

  const out = new Map<string, { x: number; y: number }>();

  if (mode === 'horizontal' || mode === 'vertical') {
    const first = horizontal ? sorted[0].x : sorted[0].y;
    const last = horizontal
      ? sorted[sorted.length - 1].x
      : sorted[sorted.length - 1].y;
    const step = (last - first) / (sorted.length - 1);
    sorted.forEach((item, i) => {
      const value = snapToGrid(first + i * step, gridSize);
      out.set(item.id, {
        x: horizontal ? value : item.x,
        y: horizontal ? item.y : value,
      });
    });
    return out;
  }

  const spacing = Math.max(1, gridSize);
  sorted.forEach((item, i) => {
    if (mode === 'spacingH') {
      out.set(item.id, {
        x: snapToGrid(sorted[0].x + i * spacing, gridSize),
        y: item.y,
      });
    } else {
      out.set(item.id, {
        x: item.x,
        y: snapToGrid(sorted[0].y + i * spacing, gridSize),
      });
    }
  });
  return out;
}
