import React from 'react';
import { Group, Circle } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import ScaledSymbolInner from './ScaledSymbolInner';
import { getCanvasInteractionColors } from '../../design/canvasInteractionColors';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

/** Wiring-group tap: one terminal, no canvas label. */
const ConnectionPointSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;

  return (
    <Group
      x={component.x}
      y={component.y}
      rotation={component.rotation}
      data-component-id={component.id}
      draggable
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <ScaledSymbolInner component={component}>
        {selected && (
          <Circle
            x={0}
            y={0}
            radius={10}
            stroke={getCanvasInteractionColors().selection}
            strokeWidth={2}
            dash={[4, 4]}
          />
        )}

        <Circle
          x={0}
          y={0}
          radius={4}
          fill={energized ? '#374151' : '#9CA3AF'}
          stroke="#2563EB"
          strokeWidth={1.4}
        />

        {showConnectionPoints &&
          component.connectionPoints.map((cp) => (
            <Circle
              key={cp.id}
              x={cp.x}
              y={cp.y}
              radius={5}
              fill="#3B82F6"
              opacity={0.75}
              stroke="#2563EB"
              strokeWidth={1.2}
              hitStrokeWidth={14}
            />
          ))}
      </ScaledSymbolInner>
    </Group>
  );
};

export default ConnectionPointSymbol;
