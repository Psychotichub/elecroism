import React from 'react';
import { Group, Circle } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const JunctionSymbol: React.FC<Props> = ({
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
      draggable
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      {selected && (
        <Circle
          x={0}
          y={0}
          radius={12}
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[4, 4]}
        />
      )}

      <Circle
        x={0}
        y={0}
        radius={5}
        fill={energized ? '#374151' : '#9CA3AF'}
        stroke="#374151"
        strokeWidth={1.5}
      />

      {showConnectionPoints &&
        component.connectionPoints.map((cp) => (
          <Circle
            key={cp.id}
            x={cp.x}
            y={cp.y}
            radius={5}
            fill="#3B82F6"
            opacity={0.6}
            stroke="#2563EB"
            strokeWidth={1}
          />
        ))}
    </Group>
  );
};

export default JunctionSymbol;
