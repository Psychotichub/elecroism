import React, { useEffect, useState } from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onToggle: () => void;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  onReset: () => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const BreakerSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onToggle,
  onSelect,
  onDragEnd,
  onReset,
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
        if (isTripped) {
          onReset();
        } else {
          onToggle();
        }
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      {selected && (
        <Rect
          x={-21}
          y={-30}
          width={42}
          height={60}
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[4, 4]}
          cornerRadius={4}
        />
      )}

      <Rect
        x={-17}
        y={-26}
        width={34}
        height={52}
        fill={energized ? '#F3F4F6' : '#E5E7EB'}
        stroke="#374151"
        strokeWidth={1.5}
        cornerRadius={3}
      />

      <Rect
        x={-5}
        y={-23}
        width={10}
        height={14}
        fill={handleColor}
        cornerRadius={2}
      />

      <Text
        text="RCD"
        x={-10}
        y={-5}
        fontSize={8}
        fill="#374151"
        fontStyle="bold"
        listening={false}
      />

      <Text
        text={`${component.properties.rcdSensitivity || 30}mA`}
        x={-12}
        y={6}
        fontSize={7}
        fill="#6B7280"
        listening={false}
      />

      <Circle
        x={0}
        y={18}
        radius={4}
        fill="#D1D5DB"
        stroke="#9CA3AF"
        strokeWidth={1}
      />
      <Text
        text="T"
        x={-3}
        y={14}
        fontSize={6}
        fill="#6B7280"
        listening={false}
      />

      <Line points={[0, -26, 0, -30]} stroke="#374151" strokeWidth={2} />
      <Line points={[0, 26, 0, 30]} stroke="#374151" strokeWidth={2} />

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

export default BreakerSymbol;
