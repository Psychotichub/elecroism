import React from 'react';
import { Text } from 'react-konva';
import { useCircuitStore } from '../../store/circuitStore';

export interface ComponentCanvasLabelProps {
  componentId?: string;
  /** `CircuitComponent.label` — hidden when blank. */
  label: string;
  x: number;
  y: number;
  width: number;
  fontSize?: number;
  fill?: string;
  offsetX?: number;
  offsetY?: number;
}

/** User-editable label on the schematic (same field as Properties → Label). */
export const ComponentCanvasLabel: React.FC<ComponentCanvasLabelProps> = ({
  componentId,
  label,
  x,
  y,
  width,
  fontSize = 7,
  fill = '#6B7280',
  offsetX = 0,
  offsetY = 0,
}) => {
  const selectedId = useCircuitStore((s) => s.selectedId);
  const gridSize = useCircuitStore((s) => s.circuit.gridSize || 20);
  const updateComponent = useCircuitStore((s) => s.updateComponent);
  const t = (label ?? '').trim();
  if (!t) return null;
  return (
    <Text
      text={t}
      x={x + offsetX}
      y={y + offsetY}
      width={width}
      align="center"
      fontSize={fontSize}
      fill={fill}
      fontStyle="bold"
      stroke="#F9FAFB"
      strokeWidth={0.35}
      shadowColor="#111827"
      shadowBlur={1.5}
      shadowOpacity={0.2}
      shadowOffsetY={0.4}
      draggable
      onDragStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const targetId = componentId || selectedId;
        if (!targetId) return;
        const comp = useCircuitStore
          .getState()
          .circuit.components.find((c) => c.id === targetId);
        if (!comp) return;
        const snap = (v: number) => {
          const g = Math.max(1, gridSize);
          return Math.round(v / g) * g;
        };
        const nx = snap(e.target.x());
        const ny = snap(e.target.y());
        e.target.x(nx);
        e.target.y(ny);
        updateComponent(targetId, {
          properties: {
            ...comp.properties,
            labelOffsetX: nx - x,
            labelOffsetY: ny - y,
          },
        });
      }}
      ellipsis
    />
  );
};
