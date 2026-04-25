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

const ThreePhaseMCBSymbol: React.FC<Props> = ({
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
  const is4P = component.type === 'four_phase_mcb';
  const poleXs = is4P ? [-30, -10, 10, 30] : [-20, 0, 20];
  const minX = Math.min(...poleXs) - 6;
  const maxX = Math.max(...poleXs) + 6;
  const bodyW = maxX - minX;

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

  const title = is4P ? '4P MCB' : '3P MCB';

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
          x={minX - 4}
          y={-32}
          width={bodyW + 8}
          height={64}
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[4, 4]}
          cornerRadius={4}
        />
      )}

      <Rect
        x={minX}
        y={-25}
        width={bodyW}
        height={50}
        fill={energized ? '#F3F4F6' : '#E5E7EB'}
        stroke="#374151"
        strokeWidth={1.5}
        cornerRadius={4}
      />

      {poleXs.map((dx) => (
        <Rect
          key={dx}
          x={dx - 4}
          y={-22}
          width={8}
          height={14}
          fill={handleColor}
          cornerRadius={2}
        />
      ))}

      <Text
        text={title}
        x={minX + 2}
        y={-6}
        width={bodyW - 4}
        fontSize={8}
        fill="#374151"
        fontStyle="bold"
        align="center"
        listening={false}
      />

      <Text
        text={`${component.properties.ratingAmps || 16}A`}
        x={minX + 4}
        y={6}
        fontSize={8}
        fill="#6B7280"
        listening={false}
      />

      {component.properties.tripCurve && (
        <Text
          text={component.properties.tripCurve}
          x={minX + bodyW - 16}
          y={6}
          fontSize={7}
          fill="#9CA3AF"
          listening={false}
        />
      )}

      {poleXs.map((dx) => (
        <React.Fragment key={`lead-${dx}`}>
          <Line
            points={[dx, -25, dx, -30]}
            stroke="#374151"
            strokeWidth={2}
          />
          <Line
            points={[dx, 25, dx, 30]}
            stroke="#374151"
            strokeWidth={2}
          />
        </React.Fragment>
      ))}

      {isTripped && (
        <Circle
          x={0}
          y={-16}
          radius={3}
          fill="#EF4444"
          opacity={flashVisible ? 1 : 0.3}
        />
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

export default ThreePhaseMCBSymbol;
