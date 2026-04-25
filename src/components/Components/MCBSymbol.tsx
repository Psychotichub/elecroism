import React, { useEffect, useState } from 'react';
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

const MCBSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onToggle,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const [flashVisible, setFlashVisible] = useState(true);
  const isTripped = component.state === 'tripped';
  const isOn = component.state === 'on';
  const energized = nodeResult?.energized || false;

  useEffect(() => {
    if (!isTripped) return;
    const interval = setInterval(() => setFlashVisible((v) => !v), 500);
    return () => clearInterval(interval);
  }, [isTripped]);

  const handleColor = isTripped
    ? flashVisible
      ? '#EF4444'
      : '#7F1D1D'
    : isOn
    ? '#22C55E'
    : '#9CA3AF';

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
        if (!isTripped) onToggle();
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      {selected && (
        <Rect
          x={-18}
          y={-29}
          width={36}
          height={58}
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[4, 4]}
          cornerRadius={4}
        />
      )}

      <Rect
        x={-14}
        y={-25}
        width={28}
        height={50}
        fill={energized ? '#F3F4F6' : '#E5E7EB'}
        stroke="#374151"
        strokeWidth={1.5}
        cornerRadius={4}
      />

      <Rect
        x={-5}
        y={-22}
        width={10}
        height={16}
        fill={handleColor}
        cornerRadius={2}
      />

      <Text
        text="MCB"
        x={-10}
        y={-2}
        fontSize={8}
        fill="#374151"
        fontStyle="bold"
        listening={false}
      />

      <Text
        text={`${component.properties.ratingAmps || 16}A`}
        x={-10}
        y={8}
        fontSize={8}
        fill="#6B7280"
        listening={false}
      />

      {component.properties.tripCurve && (
        <Text
          text={component.properties.tripCurve}
          x={-10}
          y={16}
          fontSize={7}
          fill="#9CA3AF"
          listening={false}
        />
      )}

      <Line points={[0, -25, 0, -30]} stroke="#374151" strokeWidth={2} />
      <Line points={[0, 25, 0, 30]} stroke="#374151" strokeWidth={2} />

      {isTripped && (
        <Circle x={0} y={-18} radius={3} fill="#EF4444" opacity={flashVisible ? 1 : 0.3} />
      )}

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

export default MCBSymbol;
