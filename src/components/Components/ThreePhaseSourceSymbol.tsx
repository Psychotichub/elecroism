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

const ThreePhaseSourceSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;
  const vLL =
    component.properties.lineVoltage ||
    component.properties.voltage ||
    400;

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
          radius={28}
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[4, 4]}
        />
      )}

      <Circle
        x={0}
        y={0}
        radius={22}
        fill={energized ? '#FEF9C3' : '#F3F4F6'}
        stroke={energized ? '#CA8A04' : '#374151'}
        strokeWidth={2}
        shadowColor={energized ? '#EAB308' : undefined}
        shadowBlur={energized ? 10 : 0}
      />

      <Arc
        x={-5}
        y={0}
        innerRadius={0}
        outerRadius={9}
        angle={180}
        rotation={-90}
        stroke="#374151"
        strokeWidth={1.5}
        fill="transparent"
      />
      <Arc
        x={5}
        y={0}
        innerRadius={0}
        outerRadius={9}
        angle={180}
        rotation={90}
        stroke="#374151"
        strokeWidth={1.5}
        fill="transparent"
      />

      <Text
        text="3φ"
        x={-8}
        y={-8}
        fontSize={11}
        fill="#374151"
        fontStyle="bold"
        listening={false}
      />

      <Text
        text={`${vLL}V LL`}
        x={-18}
        y={-30}
        fontSize={9}
        fill="#374151"
        fontStyle="bold"
        listening={false}
      />

      <Text
        text={component.label}
        x={-28}
        y={26}
        width={56}
        fontSize={9}
        fill="#6B7280"
        align="center"
        listening={false}
      />

      <Line points={[-20, -22, -20, -32]} stroke="#7C3F19" strokeWidth={2} />
      <Line points={[0, -22, 0, -32]} stroke="#111827" strokeWidth={2} />
      <Line points={[20, -22, 20, -32]} stroke="#4B5563" strokeWidth={2} />
      <Line points={[0, 22, 0, 32]} stroke="#2563EB" strokeWidth={2} />

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

export default ThreePhaseSourceSymbol;
