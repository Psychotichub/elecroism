import React from 'react';
import { Group, Circle, Line, Text, Arc } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const PowerSourceSymbol: React.FC<Props> = ({
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
        <Circle
          x={0}
          y={0}
          radius={24}
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[4, 4]}
        />
      )}

      <Circle
        x={0}
        y={0}
        radius={20}
        fill={energized ? '#FEF3C7' : '#F3F4F6'}
        stroke={energized ? '#F59E0B' : '#374151'}
        strokeWidth={2}
        shadowColor={energized ? '#F59E0B' : undefined}
        shadowBlur={energized ? 10 : 0}
      />

      <Arc
        x={-4}
        y={0}
        innerRadius={0}
        outerRadius={8}
        angle={180}
        rotation={-90}
        stroke="#374151"
        strokeWidth={1.5}
        fill="transparent"
      />
      <Arc
        x={4}
        y={0}
        innerRadius={0}
        outerRadius={8}
        angle={180}
        rotation={90}
        stroke="#374151"
        strokeWidth={1.5}
        fill="transparent"
      />

      <Text
        text={`${component.properties.voltage || 230}V`}
        x={-14}
        y={-24}
        fontSize={9}
        fill="#374151"
        fontStyle="bold"
        listening={false}
      />

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

      <Line points={[0, 20, 0, 30]} stroke="#8B4513" strokeWidth={2} />
      <Line points={[-15, 20, -15, 30]} stroke="#2563EB" strokeWidth={2} />

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

export default PowerSourceSymbol;
