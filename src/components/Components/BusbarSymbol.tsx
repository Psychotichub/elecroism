import React from 'react';
import { Group, Rect, Circle } from 'react-konva';
import type { CircuitComponent, NodeResult, WireColor } from '../../types';
import { getWireColor } from '../../utils/geometry';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';
import ScaledSymbolInner from './ScaledSymbolInner';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
  effectiveWireColor?: WireColor;
}

const BusbarSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
  effectiveWireColor,
}) => {
  const energized = nodeResult?.energized || false;
  const configuredColor = getWireColor(
    effectiveWireColor || component.properties.wireColor || 'brown'
  );
  const barColor = energized ? configuredColor : '#9CA3AF';
  const barStroke = energized ? '#374151' : '#6B7280';

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
      <ScaledSymbolInner component={component}>
      {selected && (
        <Rect
          x={-64}
          y={-8}
          width={128}
          height={16}
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[4, 4]}
          cornerRadius={2}
        />
      )}

      <Rect
        x={-60}
        y={-4}
        width={120}
        height={8}
        fill={barColor}
        stroke={barStroke}
        strokeWidth={1}
        cornerRadius={2}
        shadowColor={energized ? configuredColor : undefined}
        shadowBlur={energized ? 8 : 0}
        opacity={1}
      />

      <ComponentCanvasLabel
        label={component.label}
        x={-60}
        y={-16}
        width={120}
        fontSize={9}
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
      </ScaledSymbolInner>
    </Group>
  );
};

export default BusbarSymbol;
