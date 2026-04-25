import React from 'react';
import { Group, Circle, Line, Text } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onToggle: () => void;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const SwitchSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onToggle,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const isOn = component.state === 'on';
  const energized = nodeResult?.energized || false;
  const color = energized ? '#F59E0B' : '#374151';

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
      onDblClick={(e) => {
        e.cancelBubble = true;
        onToggle();
      }}
      onDragEnd={(e) => {
        onDragEnd(e.target.x(), e.target.y());
      }}
    >
      {selected && (
        <Line
          points={[-18, -24, 18, -24, 18, 24, -18, 24]}
          closed
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[4, 4]}
        />
      )}

      <Circle x={0} y={-16} radius={4} fill={color} stroke={color} strokeWidth={1.5} />
      <Circle x={0} y={16} radius={4} fill={color} stroke={color} strokeWidth={1.5} />

      {isOn ? (
        <Line points={[0, -12, 0, 12]} stroke={color} strokeWidth={2.5} />
      ) : (
        <Line points={[0, -12, 12, 8]} stroke={color} strokeWidth={2.5} />
      )}

      <Line points={[0, -16, 0, -20]} stroke={color} strokeWidth={2} />
      <Line points={[0, 16, 0, 20]} stroke={color} strokeWidth={2} />

      {energized && (
        <Circle
          x={0}
          y={-16}
          radius={6}
          fill="#F59E0B"
          opacity={0.3}
          listening={false}
        />
      )}

      <Text
        text={component.label}
        x={14}
        y={-6}
        fontSize={10}
        fill="#6B7280"
        listening={false}
      />

      <Text
        text={isOn ? 'ON' : 'OFF'}
        x={14}
        y={6}
        fontSize={8}
        fill={isOn ? '#22C55E' : '#9CA3AF'}
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

export default SwitchSymbol;
