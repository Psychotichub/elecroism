import React from 'react';
import { Group, Rect, Circle, Text, Line } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const SocketSymbol: React.FC<Props> = ({
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
      draggable
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      {selected && (
        <Rect
          x={-24}
          y={-24}
          width={48}
          height={48}
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[4, 4]}
          cornerRadius={6}
        />
      )}

      <Rect
        x={-20}
        y={-20}
        width={40}
        height={40}
        fill={energized ? '#FAFAFA' : '#F3F4F6'}
        stroke="#374151"
        strokeWidth={1.5}
        cornerRadius={6}
      />

      <Circle x={-7} y={-5} radius={3} fill="#374151" />
      <Circle x={7} y={-5} radius={3} fill="#374151" />

      <Rect x={-3} y={5} width={6} height={8} fill="#374151" cornerRadius={1} />

      <Circle
        x={14}
        y={14}
        radius={3}
        fill={energized ? '#22C55E' : '#9CA3AF'}
      />

      <Line points={[-10, -20, -10, -24]} stroke="#374151" strokeWidth={2} />
      <Line points={[10, -20, 10, -24]} stroke="#374151" strokeWidth={2} />
      <Line points={[0, 20, 0, 24]} stroke="#22C55E" strokeWidth={2} />

      <Text
        text={component.label}
        x={-20}
        y={22}
        width={40}
        fontSize={9}
        fill="#6B7280"
        align="center"
        listening={false}
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

export default SocketSymbol;
