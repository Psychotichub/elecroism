import { describe, expect, it } from 'vitest';
import {
  astarOrthogonalRoute,
  routeWireBetweenTerminals,
  type WireObstacleRect,
} from '../wireAutoRoute';

describe('astarOrthogonalRoute', () => {
  it('routes around a blocking rectangle', () => {
    const obstacle: WireObstacleRect = { x: 90, y: 90, w: 20, h: 20 };
    const path = astarOrthogonalRoute(0, 100, 200, 100, [obstacle], 20);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThanOrEqual(4);
    const crossesBlock = path!.some(
      (_, i) =>
        i % 2 === 0 &&
        i + 1 < path!.length &&
        path![i] >= 90 &&
        path![i] <= 110 &&
        path![i + 1] >= 90 &&
        path![i + 1] <= 110
    );
    expect(crossesBlock).toBe(false);
  });
});

describe('routeWireBetweenTerminals', () => {
  it('prefers obstacle-free A* path over blocked L-route', () => {
    const obstacle: WireObstacleRect = { x: 90, y: 90, w: 20, h: 20 };
    const path = routeWireBetweenTerminals(
      0,
      100,
      200,
      100,
      'h',
      'h',
      [obstacle],
      20
    );
    expect(path.length).toBeGreaterThanOrEqual(4);
  });
});
