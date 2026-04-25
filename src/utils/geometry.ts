export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function rotatePoint(
  cx: number,
  cy: number,
  angle: number
): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  return {
    x: cx * Math.cos(rad) - cy * Math.sin(rad),
    y: cx * Math.sin(rad) + cy * Math.cos(rad),
  };
}

export function getWireColor(color: string): string {
  const colors: Record<string, string> = {
    brown: '#7C3F19',
    blue: '#2563EB',
    green_yellow: '#65A30D',
    black: '#111827',
    grey: '#4B5563',
    red: '#B91C1C',
  };
  return colors[color] || '#1F2937';
}

export function getWireWidth(crossSection: number): number {
  const widths: Record<number, number> = {
    1.5: 2,
    2.5: 3,
    4: 4,
    6: 5,
    10: 6,
  };
  return widths[crossSection] || 3;
}
