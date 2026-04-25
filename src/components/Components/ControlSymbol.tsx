import React from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
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

const ControlSymbol: React.FC<Props> = ({
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

  const getLabel = () => {
    switch (component.type) {
      case 'contactor':
        return 'KM';
      case 'relay':
        return 'KA';
      case 'timer':
        return 'KT';
      case 'overload_relay':
        return 'OL';
      default:
        return '?';
    }
  };

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
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      {selected && (
        <Rect
          x={-22}
          y={-30}
          width={44}
          height={60}
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[4, 4]}
          cornerRadius={4}
        />
      )}

      <Rect
        x={-18}
        y={-25}
        width={36}
        height={50}
        fill={energized ? '#F0FDF4' : '#F3F4F6'}
        stroke="#374151"
        strokeWidth={1.5}
        cornerRadius={4}
      />

      <Rect
        x={-14}
        y={-8}
        width={28}
        height={16}
        fill="transparent"
        stroke="#374151"
        strokeWidth={1}
      />

      <Text
        text={getLabel()}
        x={-8}
        y={-6}
        fontSize={10}
        fill="#374151"
        fontStyle="bold"
        listening={false}
      />

      <Circle
        x={10}
        y={-18}
        radius={3}
        fill={isOn ? '#22C55E' : '#9CA3AF'}
      />

      <Text
        text={component.label}
        x={-18}
        y={12}
        width={36}
        fontSize={7}
        fill="#6B7280"
        align="center"
        listening={false}
      />

      <Line points={[0, -25, 0, -30]} stroke="#374151" strokeWidth={2} />
      <Line points={[0, 25, 0, 30]} stroke="#374151" strokeWidth={2} />
      <Line points={[-18, 0, -24, 0]} stroke="#374151" strokeWidth={1.5} />
      <Line points={[18, 0, 24, 0]} stroke="#374151" strokeWidth={1.5} />

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

export default ControlSymbol;
