import React from 'react';
import { Text } from 'react-konva';

export interface ComponentCanvasLabelProps {
  /** `CircuitComponent.label` — hidden when blank. */
  label: string;
  x: number;
  y: number;
  width: number;
  fontSize?: number;
  fill?: string;
}

/** User-editable label on the schematic (same field as Properties → Label). */
export const ComponentCanvasLabel: React.FC<ComponentCanvasLabelProps> = ({
  label,
  x,
  y,
  width,
  fontSize = 8,
  fill = '#6B7280',
}) => {
  const t = (label ?? '').trim();
  if (!t) return null;
  return (
    <Text
      text={t}
      x={x}
      y={y}
      width={width}
      align="center"
      fontSize={fontSize}
      fill={fill}
      listening={false}
      ellipsis
    />
  );
};
